import createServer from "./server";

process.on("unhandledRejection", (err) => {
  console.error(err);
  process.exit(1);
});

const startServer = async () => {
  const server = await createServer();

  await server.ready();

  server.listen(
    { port: 8080, host: "0.0.0.0" },
    function (err: any, address: any) {
      if (err) {
        server.log.error(err);
        process.exit(1);
      }
      console.log(`Server is now listening on ${address}`);
    }
  );
};

startServer();
