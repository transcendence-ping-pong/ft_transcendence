
// Require the framework and instantiate it, as well as needed plugins
const path = require('path');
const fastify = require('fastify')({ logger: true })
const fastifyStatic = require('@fastify/static');

// Serve static files like index.html
fastify.register(fastifyStatic, {
  root: path.join(__dirname, 'src'),
  prefix: '/',
});

// Handle form submissions
fastify.post('/login', async (request, reply) => {
  const { username, password } = request.body;

	console.log('Form received:');
	console.log('Username:', username);
	console.log('Password:', password);
	reply.send({ status: 'ok' });
});

// Run the server!
fastify.listen({ port: 5000, host: '0.0.0.0' }, (err) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})
