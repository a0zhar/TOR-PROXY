// Initialize the app object
var app = {};

// Error handling function
app.error = function () {
  return chrome.runtime.lastError;
};

// Proxy settings related functions
app.proxy = {
  query: {
    all: function (callback) {
      if (chrome.proxy) {
        chrome.proxy.settings.get({}, callback);
      }
    }
  },
  apply: function (e, callback) {
    if (chrome.proxy) {
      chrome.proxy.settings.set(
        {
          value: e.value,
          scope: e.scope
        },
        callback
      );
    }
  }
};

// Popup related functions
app.popup = {
  port: null,
  message: {},
  receive: function (id, callback) {
    if (id) {
      app.popup.message[id] = callback;
    }
  },
  send: function (id, data) {
    if (id) {
      chrome.runtime.sendMessage(
        {
          data: data,
          method: id,
          path: "background-to-popup"
        },
        app.error
      );
    }
  },
  post: function (id, data) {
    if (id && app.popup.port) {
      app.popup.port.postMessage({
        data: data,
        method: id,
        path: "background-to-popup"
      });
    }
  }
};

// Button related functions
app.button = {
  icon: function (tabId, path, callback) {
    const iconPath =
      typeof path === "object"
        ? path : 
          {
            16: `../data/icons/${path ? path + "/" : ""}16.png`,
            32: `../data/icons/${path ? path + "/" : ""}32.png`,
            48: `../data/icons/${path ? path + "/" : ""}48.png`,
            64: `../data/icons/${path ? path + "/" : ""}64.png`
          };

    const options = { path: iconPath };
    if (tabId) options.tabId = tabId;

    chrome.action.setIcon(options, callback);
  }
};

// Notifications related functions
app.notifications = {
  id: "onion-button-notifications-id",
  on: {
    clicked: function (callback) {
      chrome.notifications.onClicked.addListener(function (e) {
        app.storage.load(() => callback(e));
      });
    }
  },
  create: function (e, callback) {
    const notificationOptions = {
      type: e.type || "basic",
      message: e.message || "",
      title: e.title || "Notifications",
      iconUrl: e.iconUrl
        ? chrome.runtime.getURL(e.iconUrl)
        : chrome.runtime.getURL("/data/icons/64.png")
    };

    chrome.notifications.create(
      app.notifications.id,
      notificationOptions,
      callback
    );
  }
};

// Storage related functions
app.storage = {
  local: {},
  read: function (id) {
    return app.storage.local[id];
  },
  update: function (callback) {
    chrome.storage.local.get(null, function (e) {
      app.storage.local = e;
      if (callback) callback("update");
    });
  },
  write: function (id, data, callback) {
    const tmp = { [id]: data };
    app.storage.local[id] = data;

    chrome.storage.local.set(tmp, callback);
  },
  load: function (callback) {
    const keys = Object.keys(app.storage.local);
    if (keys && keys.length) {
      callback("cache");
    } else {
      app.storage.update(() => callback("disk"));
    }
  }
};

// Event listeners related functions
app.on = {
  management: function (callback) {
    chrome.management.getSelf(callback);
  },
  uninstalled: function (url) {
    chrome.runtime.setUninstallURL(url, () => {});
  },
  installed: function (callback) {
    chrome.runtime.onInstalled.addListener(function (e) {
      app.storage.load(() => callback(e));
    });
  },
  startup: function (callback) {
    chrome.runtime.onStartup.addListener(function (e) {
      app.storage.load(() => callback(e));
    });
  },
  connect: function (callback) {
    chrome.runtime.onConnect.addListener(function (e) {
      app.storage.load(() => callback(e));
    });
  },
  storage: function (callback) {
    chrome.storage.onChanged.addListener(function (changes, namespace) {
      app.storage.update(() => callback(changes, namespace));
    });
  },
  message: function (callback) {
    chrome.runtime.onMessage.addListener(function (
      request,
      sender,
      sendResponse
    ) {
      app.storage.load(() => callback(request, sender, sendResponse));
      return true;
    });
  }
};

// Tab related functions
app.tab = {
  query: {
    index: function (callback) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        callback(tabs && tabs.length ? tabs[0].index : undefined);
      });
    }
  },
  open: function (url, index, active, callback) {
    const properties = {
      url: url,
      active: active !== undefined ? active : true
    };

    if (typeof index === "number") {
      properties.index = index + 1;
    }

    chrome.tabs.create(properties, callback);
  },
  reload: function (tabId, options, callback) {
    const reloadOptions = {
      bypassCache: options !== undefined ? options : false
    };

    if (tabId) {
      chrome.tabs.reload(tabId, reloadOptions, callback);
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs && tabs.length) {
          chrome.tabs.reload(tabs[0].id, reloadOptions, callback);
        }
      });
    }
  }
};
