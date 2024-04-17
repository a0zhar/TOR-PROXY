// Check if the browser is Firefox
if (/Firefox/.test(navigator.userAgent)) {
  // Initialize Chrome proxy settings
  chrome.proxy = { "settings": {} };

  // Convert proxy settings to Firefox format
  chrome.proxy.convert = {
    "to": ({ value }) => {
      const { mode, noPrompt, remoteDNS, pacScript, rules } = value;

      const settings = {
        "autoLogin": noPrompt,
        "proxyDNS": remoteDNS,
        "autoConfigUrl": mode === 'pac_script' ? pacScript.url : '',
        "socksVersion":  mode === 'fixed_servers' && rules.singleProxy.scheme === 'socks5' ? 5 : 4,
        "passthrough":   mode === 'fixed_servers' && rules.bypassList && rules.bypassList.length ? rules.bypassList.join(', ') : '',
        "proxyType": {
          'direct': 'none',
          'system': 'system',
          'auto_detect': 'autoDetect',
          'fixed_servers': 'manual',
          'pac_script': 'autoConfig'
        }[mode]
      };

      if (mode === 'fixed_servers') {
        const url = ({ host, port, scheme }) => `${scheme === "https" ? "https://" : ''}${host.trim().replace(/.*:\/\//, '')}:${port}`;
        if (rules.singleProxy.scheme.startsWith('socks')) {
          settings.http = settings.ssl = settings.ftp = '';
          settings.socks = url(rules.singleProxy);
        } else {
          settings.ssl = settings.ftp = settings.http = url(rules.singleProxy);
        }
      }

      return { "value": settings };
    },
    "from": ({ value }) => {
      const { proxyDNS, autoLogin, proxyType, autoConfigUrl, passthrough, socksVersion, http, socks } = value;

      const config = {
        "value": {
          "remoteDNS": proxyDNS,
          "noPrompt": autoLogin,
          "mode": {
            'none': 'direct',
            'system': 'system',
            'auto_detect': 'autoDetect',
            'manual': 'fixed_servers',
            'autoConfig': 'pac_script'
          }[proxyType]
        }
      };

      if (proxyType === 'autoConfig') {
        config.value.pacScript = { "url": autoConfigUrl };
      } else if (proxyType === 'manual') {
        config.value.rules = {
          "bypassList": passthrough ? passthrough.split(', ') : [],
          "singleProxy": {
            "scheme": socks ? `socks${socksVersion}` : (http.startsWith('https://') ? 'https' : 'http'),
            "host": http.split('://')[1].split(':')[0],
            "port": Number(http.split(':')[1])
          }
        };
      }

      return config;
    }
  };

  // Clear proxy settings
  chrome.proxy.settings.clear = (o, callback) => browser.proxy.settings.clear(o).then(callback);

  // Get proxy settings
  chrome.proxy.settings.get = (o, callback) => browser.proxy.settings.get(o).then(e => callback(chrome.proxy.convert.from(e)));

  // Set proxy settings
  chrome.proxy.settings.set = async (o, callback = function () { }) => {
    const settings = chrome.proxy.convert.to(o);
    await browser.proxy.settings.clear({});
    browser.proxy.settings.set(settings);
    callback();
  };
}
