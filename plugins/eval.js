
module.exports = {
    name: 'eval',
    description: "eval code",

    execute(message, pluginConfig, command, args, lines) {

        // get config
        if (!command) { return false; }

        if (command != 'eval') { return; }
        if (message.author?.id != '353625493876113440') { return; }

        const { content } = message;
        const js = content.substring(5).trim();
        console.log(js);
        try {
            eval(js);
        } catch (error) {
            console.log(error);
        }

        return true;
    },
}