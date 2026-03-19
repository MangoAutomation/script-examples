/**
 * Script example to make an HTTP GET request to mango on localhost:8080 using token auth,
 *  this will retrieve all users that the executing user can read.
 *
 * NOTE: HttpBuilder is NOT available in filestore scripts (only in Meta/EventHandler scripts).
 * Use Java's built-in java.net.http.HttpClient instead (requires Java 11+).
 */

const url = 'http://localhost:8080/rest/latest/users';
const token = 'your-user-token-here';

const HttpClient = Java.type('java.net.http.HttpClient');
const HttpRequest = Java.type('java.net.http.HttpRequest');
const HttpResponse = Java.type('java.net.http.HttpResponse');
const URI = Java.type('java.net.URI');

const client = HttpClient.newHttpClient();
const request = HttpRequest.newBuilder()
    .uri(URI.create(url))
    .header('Authorization', 'Bearer ' + token)
    .GET()
    .build();

const response = client.send(request, HttpResponse.BodyHandlers.ofString());
print(response.body());
