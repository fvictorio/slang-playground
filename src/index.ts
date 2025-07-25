import { Query, QueryMatch } from "@nomicfoundation/slang/cst";
import { Parser } from "@nomicfoundation/slang/parser";
import { LanguageFacts } from "@nomicfoundation/slang/utils";

const input1 = document.getElementById('input1')! as HTMLTextAreaElement;
const input2 = document.getElementById('input2')! as HTMLTextAreaElement;
const output = document.getElementById('output')!;

const initialSolidityCode = `
contract Foo {}

contract Bar {}
`.trim();

const initialQuery = `
[ContractDefinition
  name: ["Foo"]
]
`.trim();

input1.value = initialSolidityCode;
input2.value = initialQuery;

function updateOutput() {
    output.textContent = "Write Solidity code and a Slang query to see the results here.";

    const parser = Parser.create(LanguageFacts.latestVersion());

    const tree = parser.parseFileContents(input1.value);
    const cursor = tree.createTreeCursor();

    if (tree.errors().length > 0) {
        output.textContent = "Error parsing the Solidity file: " + tree.errors()[0].message;
        return;
    }

    if (input2.value.trim() === "") {
        return;
    }
    let query: Query;
    try {
        query = Query.create(input2.value);
    } catch (e) {
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

input1.addEventListener('input', updateOutput);
input2.addEventListener('input', updateOutput);

updateOutput();
