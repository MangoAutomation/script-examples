/**
 * Script example to make an HTTP GET request to mango on localhost:8080 using token auth,
 *  this will retrieve all users that the executing user can read
 */
 
const Common = Java.type('com.serotonin.m2m2.Common');
const HttpGet = Java.type('org.apache.http.client.methods.HttpGet');
const BasicHeader = Java.type('org.apache.http.message.BasicHeader');
const HttpHeaders = Java.type('org.apache.http.HttpHeaders');
const HttpResponse = Java.type('org.apache.http.HttpResponse');
const EntityUtils = Java.type('org.apache.http.util.EntityUtils');

const timeoutMs = 3000;
const retries = 0;

const url = 'http://localhost:8080/rest/latest/users'
const token = 'your-user-token-here';


const httpClient = Common.getHttpClient(timeoutMs, retries);
const request = new HttpGet(url);

request.setHeader(new BasicHeader(HttpHeaders.AUTHORIZATION, 'Bearer ' + token));

const response = httpClient.execute(request);
const responseEntity = response.getEntity();
const responseBody = EntityUtils.toString(responseEntity);

print(responseBody);