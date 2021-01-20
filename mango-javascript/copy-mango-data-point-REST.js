/*
* Get a data point from Mango, modify it and create a new point on the same data source
*/
var sourcePointXid = 'voltage';

//Token for user with permission to get and create the point
var userToken = 'eyJhbGciOiJFUzUxMiJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTc2ODkzOTAxMywiaWQiOjEsInYiOjEsInR5cCI6ImF1dGgifQ.AU-YbdpreFzxnVlu1pbDL32BPZCOSnlPoMY15Ut-TZZPF46ID4Awzg4-XLgSjcn5lFj3NtoiIyz2-FtVw3uZz_QrAH_K8vrQ2sP17wULrhg87FvdFw7iaJTXqlliwK4MCTUShRQvUqETjV1hGHIvSrlPtc94Ro4FRA4vzY7zfBkIhCIM';

var sourcePoint = HttpBuilder.request({
    path: 'http://localhost:8080/rest/latest/data-points/' + sourcePointXid,
    method: 'GET',
    headers: {
        authorization: 'Bearer ' + userToken
    },
    parameters: {},
    err: function(status, headers, content) { //errorCallback for linguistic completion
        throw 'Request got bad response: ' + status;
    },
    resp: function(status, headers, content) { //responseCallback
        //print(content); //To see what you are modifing
        return JSON.parse(content);
    },
    excp: function(exception) { //exceptionCallback
        throw exception.getMessage();
    }
});

//Modify the point
sourcePoint.id = null;
sourcePoint.xid = null;
sourcePoint.name = 'Test Point Created by script';

//Create new point
var url = 'http://localhost:8080/rest/latest/data-points';
var headers = {
        authorization: 'Bearer ' + userToken
    };
var content = JSON.stringify(sourcePoint);
var postPointBuilder = HttpBuilder.post(url, headers, content);

//set acceptable status to 201 Created
postPointBuilder.setOkayStatusArray([201]);

//Set callbacks
postPointBuilder.resp(function(status, headers, content) { //responseCallback
        print(content); //To see what you are modifin
        return true;
    });
postPointBuilder.err(function(status, headers, content) { //errorCallback for linguistic completion
        throw 'Request got bad response: ' + status;
    });
postPointBuilder.excp(function(exception) { //exceptionCallback
        throw exception.getMessage();
    });

if(postPointBuilder.execute()) {
    print('Created point');
}
