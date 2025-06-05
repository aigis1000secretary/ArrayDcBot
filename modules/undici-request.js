
const undici = require('undici');
const queryString = require('qs');

module.exports = {

    request: async function ({ url, qs, method = 'GET', headers, body, type = 'raw' }) {

        const uri = (!!qs ? new URL(url + '?' + queryString.stringify(qs)) : new URL(url)).toString();
        const options = { method, headers, body };

        const res = await undici.request(uri, options).catch(e => { throw new Error(e.message); });

        if (type != 'raw') {

            const _text = await res.body.text(); // .catch(e => console.log(method, type, 'body.text() error', e.message));
            const _json = ((t) => { try { return JSON.parse(t); } catch (e) { } })(_text);

            if (type == 'json' && res.statusCode == 200) {
                return { statusCode: res.statusCode, body: _json || _text };
            } else {
                return { statusCode: res.statusCode, body: _text };
            }
        }

        return { statusCode: res.statusCode, body: res.body };
    },

    get: function ({ url, qs, headers, json = false }) {
        return module.exports.request({ url, qs, method: 'GET', headers, type: json ? 'json' : 'text' }).catch(e => console.log(`undici get`, e) || null);
    },

    post: function ({ url, qs, form, headers, json = false }) {
        const body = new URLSearchParams(form);
        return module.exports.request({ url, qs, method: 'POST', headers, body, type: json ? 'json' : 'text' }).catch(e => console.log(`undici post`, e) || null);
    },

    delete: function ({ url, qs, headers, json = false }) {
        return module.exports.request({ url, qs, method: 'DELETE', headers, type: json ? 'json' : 'text' }).catch(e => console.log(`undici del`, e) || null);
    },

    pipe: require('util').promisify(require('stream').pipeline),

}