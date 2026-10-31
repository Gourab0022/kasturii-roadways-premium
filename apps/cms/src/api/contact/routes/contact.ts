export default {
  routes: [
    {
      method: "POST",
      path: "/contact",
      handler: "contact.submit",
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
