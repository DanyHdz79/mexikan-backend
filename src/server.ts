import express, { json } from "express";
import compression from "compression";
import cors from "cors";
import schema from "./schema"

import { ApolloServer } from "apollo-server-express";
import { createServer } from "http";
import { createContext } from "./context"

import environments from "./config/environments"
if (process.env.NODE_ENV !== "production") {
    const envs = environments;
}


async function init() {
    const app = express();
    app.use(json({ limit: '2mb' }))
    
    app.use('*', cors());
    
    app.use(compression());
    
    const server = new ApolloServer({
        schema,
        context: createContext(),
        introspection: true
    });
    
    server.applyMiddleware({ app });
    
    const PORT = process.env.PORT || 8000;
    const httpServer = createServer(app);
    
    
    
    httpServer.listen(
        { port: PORT },
        () => console.log(`ApolloServer connected at http://localhost:${ PORT }/graphql`)
    );
}

init();