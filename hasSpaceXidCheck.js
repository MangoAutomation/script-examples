// import services
const dataPointService = services.dataPointService;
const dataSourceService = services.dataSourceService;
const publisherService = services.publisherService;
const eventHandlerService = services.eventHandlerService;
const roleService = services.roleService;
const usersService = services.usersService; // Correct user service

// Function to check if a string contains a space
function hasSpace(xid) {
    return xid.includes(' ');
}

// Function to check XIDs in a list of objects and log those with spaces
function checkXids(objects, objectType) {
    var xidsWithSpaces = [];

    if (objects) {
        for (var i = 0; i < objects.length; i++) {
            var obj = objects[i];
            var xid = obj.getXid();

            if (hasSpace(xid)) {
                xidsWithSpaces.push(xid);
                console.log(objectType + ' XID with space found:', xid);
            }
        }
    } else {
        console.log(objectType + " list is undefined or null.");
    }

    return xidsWithSpaces;
}

// Retrieve all Data Points, Data Sources, Roles, Publishers, and Event Handlers
var dataPoints = dataPointService.list();  // Assuming 'list()' returns all data points
var dataSources = dataSourceService.list(); // Assuming 'list()' returns all data sources
var roles = roleService.list(); // Assuming 'list()' returns all roles
var publishers = publisherService.list(); // Assuming 'list()' returns all publishers
var eventHandlers = eventHandlerService.list(); // Using the corrected service and method


// Retrieve all users using the usersService
var users;
try {
    users = usersService.buildQuery().query(); // Retrieve all users without filters
} catch (e) {
    console.log("Error retrieving users:", e);
}

// Check XIDs for spaces in each type of object
var pointsWithSpaces = checkXids(dataPoints, 'Data Point');
var sourcesWithSpaces = checkXids(dataSources, 'Data Source');
var rolesWithSpaces = checkXids(roles, 'Role');
var publishersWithSpaces = checkXids(publishers, 'Publisher');
var eventHandlersWithSpaces = checkXids(eventHandlers, 'Event Handlers');


var usersWithSpaces;
if (users) {
    usersWithSpaces = checkXids(users, 'User');
} else {
    usersWithSpaces = [];
}

// Output summary of XIDs with spaces
function summarizeResults(xidsWithSpaces, objectType) {
    if (xidsWithSpaces.length > 0) {
        console.log('Total ' + objectType + ' XIDs with spaces found:', xidsWithSpaces.length);
    } else {
        console.log('No ' + objectType + ' XIDs with spaces found.');
    }
}

summarizeResults(pointsWithSpaces, 'Data Point');
summarizeResults(sourcesWithSpaces, 'Data Source');
summarizeResults(rolesWithSpaces, 'Role');
summarizeResults(publishersWithSpaces, 'Publisher');
summarizeResults(eventHandlersWithSpaces, 'Event Handlers');
summarizeResults(usersWithSpaces, 'User');
