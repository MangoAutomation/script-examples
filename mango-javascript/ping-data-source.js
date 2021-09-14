/*
* Ping data source to check network connectivity, valid for Mango 4.2.0+
*/

// find unique set of hosts
var results = {};
for (var key in EXTERNAL_POINTS) {
    var point = this[key];
    var wrapper = point.getDataPointWrapper();
    if (wrapper.tags.pingHost) {
        results[wrapper.tags.pingHost] = null;
    }
}

// ping each host once
for (var host in results) {
    try {
        results[host] = pingUtility.ping(host);
    } catch (e) {
        // ignore, leave null
    }
}

// set the point values
for (var key in EXTERNAL_POINTS) {
    var point = this[key];
    var wrapper = point.getDataPointWrapper();
    if (wrapper.tags.pingHost) {
        var result = results[wrapper.tags.pingHost];
        switch (wrapper.name) {
            case 'Ping success': point.set(result != null); break;
            case 'Ping time (Average)': point.set(result == null ? -1 : result.average); break;
            case 'Packet loss': point.set(result == null ? -1 : result.packetLoss); break;
        }
    }
}
