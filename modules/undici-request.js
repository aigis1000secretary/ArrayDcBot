
const undici = require('undici');
const queryString = require('qs');

module.exports = {

    request: function ({ url, qs, method = 'GET', headers, body }) {
        const uri = (!!qs ? new URL(url + '?' + queryString.stringify(qs)) : new URL(url)).toString();
        const options = { method, headers, body };

        return undici.request(uri, options).catch(e => { throw new Error(e.message); });
    },

    get: async function ({ url, qs, headers, json = false }) {
        const res = await module.exports.request({ url, qs, method: 'GET', headers }).catch(e => console.log(e) || null);
        return { statusCode: res.statusCode, body: (json ? await res.body.json() : await res.body.text()) };
    },

    post: async function ({ url, qs, form, headers, json = false }) {
        const body = new URLSearchParams(form);
        const res = module.exports.request({ url, qs, method: 'POST', headers, body }).catch(e => console.log(e) || null);
        return { statusCode: res.statusCode, body: (json ? await res.body.json() : await res.body.text()) };
    },

    delete: async function ({ url, qs, headers, json = false }) {
        const res = module.exports.request({ url, qs, method: 'DELETE', headers }).catch(e => console.log(e) || null);
        return { statusCode: res.statusCode, body: (json ? await res.body.json() : await res.body.text()) };
    },

    pipe: require('util').promisify(require('stream').pipeline),

}