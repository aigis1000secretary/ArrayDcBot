
const undici = require('undici');
const queryString = require('qs');

// const _request = async function () { throw new Error('test error'); }

module.exports = {
    fetch: async function ({ url, qs, method = 'GET', headers = {}, body }) {
        // console.log(`fetch`, method, url);

        const uri = (!!qs ? new URL(url + '?' + queryString.stringify(qs)) : new URL(url)).toString();
        const options = { method, headers, body };
        const result = { statusCode: null, body: null, req: null, error: null };

        let response;
        try { response = await undici.fetch(uri, options); } catch (e) {
            result.error = e;
            return result;
        }

        const contentType = response.headers.get('Content-Type');
        if (contentType.includes('application/json')) {

            const _text = await response.text();
            try { result.body = JSON.parse(_text); } catch (e) { result.body = _text; }

        } else if (contentType.includes('text/') || contentType.includes('/xml')) {

            result.body = await response.text();

        } else {

            result.body = response.body;

        }

        // console.log(contentType);

        result.req = { host: new URL(response.url).host };
        result.statusCode = response.status;
        return result;
    },

    request: async function ({ url, qs, method = 'GET', headers = {}, body }) {
        // console.log(`request`, method, url);

        const uri = (!!qs ? new URL(url + '?' + queryString.stringify(qs)) : new URL(url)).toString();
        const options = { method, headers, body };
        const result = { statusCode: null, body: null, req: null, error: null };

        let response;
        try { response = await undici.fetch(uri, options); } catch (e) {
            result.error = e;
            return result;
        }

        // console.log(`request`, method, response.url);

        result.req = { host: new URL(response.url).host };
        result.body = response.body;
        result.statusCode = response.status;
        return result;
    },

    get: function ({ url, qs, headers }) {
        return module.exports.fetch({ url, qs, method: 'GET', headers });
    },

    post: function ({ url, qs, form, headers = {} }) {
        const body = new URLSearchParams(form);
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        return module.exports.fetch({ url, qs, method: 'POST', headers, body });
    },

    delete: function ({ url, qs, headers }) {
        return module.exports.fetch({ url, qs, method: 'DELETE', headers });
    },
    pipe: require('util').promisify(require('stream').pipeline),

}