
const { request: _request } = require('undici');
const queryString = require('qs');

// const _request = async function () { throw new Error('test error'); }

module.exports = {
    request: async function ({ url, qs, method = 'GET', headers = {}, body }) {
        console.log(method, url);

        const uri = (!!qs ? new URL(url + '?' + queryString.stringify(qs)) : new URL(url)).toString();
        const options = { method, headers, body };

        const result = { statusCode: null, body: null, text: null, error: null };

        let response;
        try {
            response = await _request(uri, options);
        } catch (e) {
            result.error = e;
            return result;
        }

        const contentType = response.headers['Content-Type'] || response.headers['content-type'] || '';
        const _text = await response.body.text();
        result.statusCode = response.statusCode;
        result.text = _text;
        result.json = null;
        try { result.json = JSON.parse(_text); } catch (e) { result.json = null; }

        if (contentType.includes('application/json')) {
            result.body = result.json;
        } else {
            result.body = _text;
        }

        return result;
    },

    get: function ({ url, qs, headers }) {
        return module.exports.request({ url, qs, method: 'GET', headers });
    },

    post: function ({ url, qs, form, headers = {} }) {
        const body = new URLSearchParams(form);
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        return module.exports.request({ url, qs, method: 'POST', headers, body });
    },

    delete: function ({ url, qs, headers }) {
        return module.exports.request({ url, qs, method: 'DELETE', headers });
    },
    // pipe: require('util').promisify(require('stream').pipeline),

}