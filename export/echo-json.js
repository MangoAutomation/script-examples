/**
 * This example reads JSON from the request body and echos it back in the response.
 * To execute this script from the default file store:
 * Method: POST
 * URL: rest/latest/script/eval-file-store/default/script-examples/echo-json.js
 * BODY: {"message": "Test"}
 */

// read all the lines from the request body
const lines = [];
let line = null;
while ((line = reader.readLine()) != null) {
    lines.push(line);
}

if (!lines.length) {
    throw new Error('No lines could be read');
}

// join the lines together and parse as JSON
const requestBody = JSON.parse(lines.join(''));

// the script needs the "Access request/response objects" system permission to access response
response.setContentType('application/json');

// serialize object back to a JSON string and print to response
print(JSON.stringify(requestBody));
