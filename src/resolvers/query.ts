import { IResolvers } from "graphql-tools";
import bcryptjs from 'bcryptjs';
import JWT from "../lib/JWT";
import jwt_decode from 'jwt-decode';


const query : IResolvers = {
    Query: {

        async logIn(_:void, { user }, ctx) {
            const currentUser = await ctx.prisma.user.findOne({
                where: {
                    email: user.email
                }
            })

            if (currentUser == null) {
                return "This user doesn't exist."
            }
            if (!bcryptjs.compareSync(user.password, currentUser.password)) {
                return "The password is incorrect."
            }
            delete currentUser.password
            let token = new JWT().sign(currentUser)
            return token
        },

        async getAllProducts(_:void, __:void, ctx) {
            try {
                const products = await ctx.prisma.product.findMany({})
                return products;
            } catch (error) {
                console.log(error)
                return []
            }
        }
    }
}

export default query;
