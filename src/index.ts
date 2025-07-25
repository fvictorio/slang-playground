import { Query, QueryMatch, TextRange } from "@nomicfoundation/slang/cst";
import { Parser } from "@nomicfoundation/slang/parser";
import { LanguageFacts } from "@nomicfoundation/slang/utils";

import { basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { EditorView, placeholder } from "@codemirror/view";
import { solidity } from '@replit/codemirror-lang-solidity';
import { linter } from "@codemirror/lint"

const initialSolidityCode = `
contract Foo {}

contract Bar {}
`.trim();

const initialQuery = `
[ContractDefinition
  name: ["Foo"]
]
`.trim();

let solidityContent = initialSolidityCode;
let queryContent = initialQuery;

const queryLinter = linter(view => {
  const querySource = view.state.doc.toString()
  try {
    Query.create(querySource);
    return [];
  } catch (e: any) {
    const textRange = e.textRange as TextRange;
    return [{
      from: textRange.start.utf8,
      to: textRange.end.utf8,
      severity: "error",
      message: e.message,
    }]
  }
})

const solidityEditorState = EditorState.create({
  doc: initialSolidityCode,
  extensions: [
    basicSetup,
    placeholder("Solidity code"),
    solidity,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        solidityContent = update.state.doc.toString();
        updateOutput();
      }
    }),
  ],
});

const solidityEditorView = new EditorView({
  state: solidityEditorState,
  parent: document.getElementById("solidityEditor")!,
});

const queryEditorState = EditorState.create({
  doc: initialQuery,
  extensions: [
    basicSetup,
    placeholder("Slang query"),
    queryLinter,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        queryContent = update.state.doc.toString();
        updateOutput();
      }
    }),
  ],
});

const queryEditorView = new EditorView({
  state: queryEditorState,
  parent: document.getElementById("queryEditor")!,
});

const output = document.getElementById("output")!;

function updateOutput() {
    output.textContent = "Write Solidity code and a Slang query to see the results here.";

    const parser = Parser.create(LanguageFacts.latestVersion());

    const tree = parser.parseFileContents(solidityContent);
    const cursor = tree.createTreeCursor();

    if (tree.errors().length > 0) {
        output.textContent = "Error parsing the Solidity file: " + tree.errors()[0].message;
        return;
    }

    if (queryContent.trim() === "") {
        return;
    }
    let query: Query;
    try {
        query = Query.create(queryContent);
    } catch (e: any) {
        output.textContent = "Error parsing the query: " + e.message;
        return;
    }

    const matches: QueryMatch[] = [...cursor.query([query])];

    if (matches.length === 0) {
        output.textContent = "No matches found.";
        return;
    }

    let result = "";
    let first = true;
    for (const [i, match] of Object.entries(matches)) {
        if (!first) {
            result += "\n";
        }
        first = false;

        result += `Match ${Number(i) + 1}:\n`
        result += `    Line: ${match.root.textRange.start.line + 1}\n`
        if (Object.values(match.captures).length > 0) {
            result += `    Captures:\n`;
            for (const [name, captures] of Object.entries(match.captures)) {
                for (const capture of captures) {
                    let content = "";
                    const nodeContent = capture.node.unparse()
                    if (nodeContent.length < 10) {
                        content = ` (${nodeContent})`;
                    }
                    result += `        ${name}: ${capture.textRange.start.line + 1}:${capture.textRange.start.column + 1}${content}\n`
                }
            }
        } else {
            result += `    No captures\n`;
        }
    }

    output.textContent = result
}

updateOutput();