/*
* Get a data point from Mango, modify it and create a new point on the same data source.
*
* NOTE: HttpBuilder is NOT available in filestore scripts (only in Meta/EventHandler scripts).
* Uses java.net.http.HttpClient instead.
*/
var sourcePointXid = 'voltage';

//Token for user with permission to get and create the point
var userToken = 'put-your-token-here';

const HttpClient = Java.type('java.net.http.HttpClient');
const HttpRequest = Java.type('java.net.http.HttpRequest');
const HttpResponse = Java.type('java.net.http.HttpResponse');
const URI = Java.type('java.net.URI');

const client = HttpClient.newHttpClient();

// GET the source point
const getRequest = HttpRequest.newBuilder()
    .uri(URI.create('http://localhost:8080/rest/latest/data-points/' + sourcePointXid))
    .header('Authorization', 'Bearer ' + userToken)
    .GET()
    .build();

const getResponse = client.send(getRequest, HttpResponse.BodyHandlers.ofString());
if(getResponse.statusCode() !== 200) {
    throw new Error('GET failed: ' + getResponse.statusCode() + ' ' + getResponse.body());
}
var sourcePoint = JSON.parse(getResponse.body());

//Modify the point
sourcePoint.id = null;
sourcePoint.xid = null;
sourcePoint.name = 'Test Point Created by script';

//Create new point via POST
const postRequest = HttpRequest.newBuilder()
    .uri(URI.create('http://localhost:8080/rest/latest/data-points'))
    .header('Authorization', 'Bearer ' + userToken)
    .header('Content-Type', 'application/json')
    .POST(HttpRequest.BodyPublishers.ofString(JSON.stringify(sourcePoint)))
    .build();

const postResponse = client.send(postRequest, HttpResponse.BodyHandlers.ofString());
if(postResponse.statusCode() === 201) {
    print(postResponse.body());
    print('Created point');
} else {
    throw new Error('POST failed: ' + postResponse.statusCode() + ' ' + postResponse.body());
}
