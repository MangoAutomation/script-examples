// requires superadmin
const Common = Java.type('com.serotonin.m2m2.Common');

function eventRaised(event) {
    console.log('eventRaised ' + event);

    // requires permission for setTimeout()
    this.timeoutId = setTimeout(() => {
        console.log('inside timeout user is ' + Common.getUser());
    }, 1000); // ms
}

function eventInactive(event) {
    console.log('eventInactive ' + event);
    clearTimeout(this.timeoutId);
}
