
async function remoteConnection(options) {

	const server = require('http').createServer();

	const io = require('socket.io')(server, {
		cors: {
			origin: "*",
			methods: ["GET", "POST"]
		}
	});

	io.on('connection', (socket) => {
		const clientId = socket.handshake.query.clientId;
		console.log('Client connected:', clientId);

		socket.on('test', (data) => {
			console.log('Received test message:', data);
			socket.emit('test', 'xau');
		})

		socket.on('disconnect', () => {
			console.log('Client disconnected:', clientId);
		});
	});

	const os = require('os');
	const getNetworkIP = () => {
		const interfaces = os.networkInterfaces();
		for (const name of Object.keys(interfaces)) {
			for (const interface of interfaces[name]) {
				if (interface.family === 'IPv4' && !interface.internal &&
					(interface.address.startsWith('192.168.') || interface.address.startsWith('10.'))) {
					return interface.address;
				}
			}
		}
		return 'localhost';
	};
};

fastify.listen({ port: port, host: '0.0.0.0' }, (err) => {
	if (err) {
		console.error('Error starting Fastify server:', err);
		return;
	}
	const networkIP = getNetworkIP();

	const socketPort = port + 1;
	server.listen(socketPort, '0.0.0.0', () => {
		console.log(`--------------------------------`);
		console.log(`Multiplayer: http://${networkIP}:80`);
		console.log(`--------------------------------`);
	});
});

module.exports = remoteConnection;
