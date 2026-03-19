//  This script will query for data points matching some query criteria, then query for the last 12hrs
//  of minutely data to output to a CSV with each point's values as a column like so:
//  timestamp,XID_1,XID_2,...
//
// To use this script you need to modify this script to:
//  1. add a token for a user with access to see the data points and write to the default filestore
//  2. setup to write to the response if running via REST api
//
// @author Terry Packer - Aug 2022
//
const Common = Java.type('com.serotonin.m2m2.Common');
const HttpPost = Java.type('org.apache.http.client.methods.HttpPost');
const BasicHeader = Java.type('org.apache.http.message.BasicHeader');
const StringEntity = Java.type('org.apache.http.entity.StringEntity');
const HttpHeaders = Java.type('org.apache.http.HttpHeaders');
const HttpResponse = Java.type('org.apache.http.HttpResponse');
const EntityUtils = Java.type('org.apache.http.util.EntityUtils');
const pointValueDao = Common.getBean(Java.type('com.serotonin.m2m2.db.dao.PointValueDao'));
const FileWriter = Java.type('java.io.FileWriter');
const BufferedWriter = Java.type('java.io.BufferedWriter');

//Write the results to the response stream when executed over REST api
const writeToResponse = true;

const timeoutMs = 120000;
const retries = 0;
const pointLimit = 10000; //For sanity for now (There are < 2500 points that match in the dev system)
const valueLimit = 12*61; //For sanity for now (12hrs of minutes)

//Set Dates to previous 12hrs
const periodTypeBack = 'HOURS';
const periodsBack = 12;
const msBack = Common.getMillis(Common.TIME_PERIOD_CODES.getId(periodTypeBack), periodsBack);
const now = new Date();
const from = new Date(now.getTime() - msBack);
const rollup = 'AVERAGE';

const url = 'https://<mango-hostname-here>/rest/latest/point-values/single-array/time-period/' + rollup;
const token = 'put-your-token-here'; //Token to use for request, generated on user's page

const filename = 'encompassSLA-' + now.toISOString() + '.csv'
//Get a new client for our REST api
const httpClient = Common.getHttpClient(timeoutMs, retries);

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

//Setup the request for the values
const request = new HttpPost(url);

//Set parmeters
request.setHeader(new BasicHeader(HttpHeaders.AUTHORIZATION, 'Bearer ' + token));
request.setHeader(new BasicHeader('Content-Type', 'application/json'));
request.setHeader(new BasicHeader('Accept', 'text/csv'));

//Set Body
const payload = {
    'xids': xids,
    'dateTimeFormat': "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
    'from': from.toISOString(),
    'to': now.toISOString(),
    'fields': ['TIMESTAMP', 'VALUE'],
    'timePeriod': {'periods': 1, 'type': 'MINUTES'},
    'truncate': true,
    'limit': valueLimit
};
const entity = new StringEntity(JSON.stringify(payload));
request.setEntity(entity);

const pointValueResponse = httpClient.execute(request);
const responseEntity = pointValueResponse.getEntity();
const responseBody = EntityUtils.toString(responseEntity);

//Write output to response (when executing via REST)
if(writeToResponse) {
    print(responseBody);
}

//Write output to filestore
const outputFile = services.fileStoreService.getPathForWrite('default', filename).toFile();
const writer = new BufferedWriter(new FileWriter(outputFile));
writer.write(responseBody);
writer.close();

