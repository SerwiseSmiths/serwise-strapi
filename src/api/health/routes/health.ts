export default {
  routes: [
    {
      method: 'GET',
      path: '/health',
      handler: 'health.check',
      config: {
        policies: [],
      },
    },
  ],
};
