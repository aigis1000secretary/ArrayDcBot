
const coreArray = new Map();

module.exports = {
    name: 'uptimer',
    description: "uptume timer",

    clockMethod(client, { hours, minutes, seconds }) {
        // check every 1 sec

        console.log(`clockMethod`,
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
    }
}
