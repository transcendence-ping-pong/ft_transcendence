const fastify = require('fastify')({ logger: true });
fastify.register(require('@fastify/cors'), { origin: '*' }); // CORS

const users = [
  { id: 1, name: 'Ada Lovelace' },
  { id: 2, name: 'Alan Turing' },
  { id: 3, name: 'Grace Hopper' },
  { id: 4, name: 'Donald Knuth' }
];

fastify.get('/users', async (request, reply) => users);

fastify.post('/match', async (request, reply) => {
  const { player1, player2 } = request.body;
  const p1 = users.find(u => u.id === player1);
  const p2 = users.find(u => u.id === player2);
  if (!p1 || !p2 || player1 === player2) {
    return reply.code(400).send({ error: 'Invalid players' });
  }
  const winner = Math.random() < 0.5 ? p1 : p2;
  return { player1: p1, player2: p2, winner };
});

fastify.listen({ port: 4000, host: '0.0.0.0' }, err => {
  if (err) throw err;
  console.log('Mock server running on http://localhost:4000');
});
