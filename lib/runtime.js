// Get the version from the manifest
const getVersion = () => chrome.runtime.getManifest().version;

// Get the homepage URL from the manifest
const getHomepage = () => chrome.runtime.getManifest().homepage_url;

// Handle analytics on install and uninstall events
const handleAnalytics = (type, previousVersion = null) => {
    const url = `${getHomepage()}?v=${getVersion()}${previousVersion ? `&p=${previousVersion}` : ''}&type=${type}`;
    app.tab.open(url, undefined, type === 'install');
};

// Handle the onInstalled event
const handleOnInstalled = (e) => {
    app.on.management((result) => {
        if (result.installType === 'normal') {
            app.tab.query.index((index) => {
                const isUpdate = e.reason === 'update';
                const previous = e.previousVersion && e.previousVersion !== getVersion();
                const doUpdate = previous && parseInt((Date.now() - config.welcome.lastupdate) / (24 * 3600 * 1000)) > 45;

                if (e.reason === 'install' || (isUpdate && doUpdate)) {
                    handleAnalytics(e.reason, e.previousVersion);
                    config.welcome.lastupdate = Date.now();
                }
            });
        }
    });
};

// Handle messages from the popup
const handleMessageFromPopup = (request) => {
    if (request && request.path === 'popup-to-background') {
        for (const id in app.popup.message) {
            if (id === request.method && typeof app.popup.message[id] === 'function') {
                app.popup.message[id](request.data);
                break;
            }
        }
    }
};

// Handle port disconnect
const handlePortDisconnect = (e) => {
    if (e && e.name && e.name in app) {
        app[e.name].port = null;
    }
};

// Handle messages from ports
const handlePortMessage = (e) => {
    if (e && e.path && e.port && e.port in app && e.path === `${e.port}-to-background`) {
        for (const id in app[e.port].message) {
            if (id === e.method && typeof app[e.port].message[id] === 'function') {
                app[e.port].message[id](e.data);
                break;
            }
        }
    }
};

// Check if the browser is running in webdriver mode
if (!navigator.webdriver) {
    app.on.uninstalled(`${getHomepage()}?v=${getVersion()}&type=uninstall`);
    app.on.installed(handleOnInstalled);
}

// Listen for messages from the popup
app.on.message(handleMessageFromPopup);

// Connect to ports
app.on.connect((port) => {
    if (port && port.name && port.name in app) {
        app[port.name].port = port;
        port.onDisconnect.addListener(handlePortDisconnect);
        port.onMessage.addListener(handlePortMessage);
    }
});
