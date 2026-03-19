//  This script will query for data points matching some query criteria, then query for the last 12hrs
//  of minutely data to output to a CSV with each point's values as a column like so:
//  timestamp,XID_1,XID_2,...
//
// To use this script you need to modify this script to:
//  1. add a token for a user with access to see the data points and write to the default filestore
//  2. setup to write to the response if running via REST api
//
// NOTE: HttpBuilder is NOT available in filestore scripts (only in Meta/EventHandler scripts).
// Uses java.net.http.HttpClient (Java 11+) for outbound HTTP requests.
//
// @author Terry Packer - Aug 2022
//
const FileWriter = Java.type('java.io.FileWriter');
const BufferedWriter = Java.type('java.io.BufferedWriter');
const HttpClient = Java.type('java.net.http.HttpClient');
const HttpRequest = Java.type('java.net.http.HttpRequest');
const HttpResponse = Java.type('java.net.http.HttpResponse');
const URI = Java.type('java.net.URI');

//Write the results to the response stream when executed over REST api
const writeToResponse = true;

const pointLimit = 10000; //For sanity for now (There are < 2500 points that match in the dev system)
const valueLimit = 12*61; //For sanity for now (12hrs of minutes)

//Set Dates to previous 12hrs
const periodsBack = 12;
const msBack = periodsBack * 60 * 60 * 1000;
const now = new Date();
const from = new Date(now.getTime() - msBack);
const rollup = 'AVERAGE';

const url = 'https://<mango-hostname-here>/rest/latest/point-values/single-array/time-period/' + rollup;
const token = 'put-your-token-here'; //Token to use for request, generated on user's page

const filename = 'encompassSLA-' + now.toISOString() + '.csv'
//Setup to return CSV
if(writeToResponse) {
    response.setContentType('text/csv');
    response.setHeader('Content-Disposition', `attachment; filename="` + filename + `"`);
}

const xids = [];
//Collect the data for matching points
const query = services.dataPointService.buildQuery()
    //FOR TESTING.equal('xid', 'DP_BAI1_DH1_NBT_01_Temperature_01:1')
    .equal('tags.deviceType', 'RACK')
    .and()
    .or()
    .equal('name', 'Temperature')
    .equal('name', 'Humidity')
    .close()
    .close();

query.query((dp) => {
        xids.push(dp.getXid());
    }, pointLimit, 0); //(callback, limit, offset)

//Build the request body
const payload = JSON.stringify({
    'xids': xids,
    'dateTimeFormat': "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
    'from': from.toISOString(),
    'to': now.toISOString(),
    'fields': ['TIMESTAMP', 'VALUE'],
    'timePeriod': {'periods': 1, 'type': 'MINUTES'},
    'truncate': true,
    'limit': valueLimit
});

//Execute the request using java.net.http.HttpClient (HttpBuilder is not available in filestore scripts)
const httpClient = HttpClient.newHttpClient();
const httpRequest = HttpRequest.newBuilder()
    .uri(URI.create(url))
    .header('Authorization', 'Bearer ' + token)
    .header('Content-Type', 'application/json')
    .header('Accept', 'text/csv')
    .POST(HttpRequest.BodyPublishers.ofString(payload))
    .build();

const httpResponse = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
if(httpResponse.statusCode() < 200 || httpResponse.statusCode() >= 300) {
    throw new Error('HTTP ' + httpResponse.statusCode() + ': ' + httpResponse.body());
}
const responseBody = httpResponse.body();

//Write output to response (when executing via REST)
if(writeToResponse) {
    print(responseBody);
}

//Write output to filestore
const outputFile = services.fileStoreService.getPathForWrite('default', filename).toFile();
const writer = new BufferedWriter(new FileWriter(outputFile));
writer.write(responseBody);
writer.close();
