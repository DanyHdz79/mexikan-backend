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
        },

        async getProductInfo(_:void, { product_id }, ctx) {
            let info:any = new JWT().verify(ctx.token)
            if (info === "failed") {
                return []
            }

            try {
                const info = await ctx.prisma.product.findOne({
                    where: {
                        sku: product_id
                    }
                })
                return info;
            } catch (error) {
                console.log(error)
                return []
            }
        },

        async showCart(_:void, __:void, ctx) {
            let info:any = new JWT().verify(ctx.token)
            if (info === "failed") {
                return false
            }

            let decoded:any = new JWT().decode(ctx.token)
            let user_id = decoded.user

            try {
                const checkOrder = await ctx.prisma.order.findMany({
                    where: {
                        id_user: user_id,
                        status: true
                    }
                });
    
                if(checkOrder && checkOrder.length) {
                    const id_cart = checkOrder[0].id
                    const cartProducts = await ctx.prisma.order_detail.findMany({
                        where: {
                            id_order: id_cart,
                        }
                    })

                    /* let productArray = []

                    for(let i = 0; i < cartProducts.length; i++) {
                        const productInfo = await ctx.prisma.product.findOne({
                            where: {
                                sku: cartProducts[i].id_product,
                            }
                        })
                        productArray.push(productInfo)
                    } */

                    return cartProducts
                }

                return [];
            } catch (error) {
                console.log(error)
                return []
            }
        },

        async getAllUserAddresses(_:void, __:void, ctx) {
            let info:any = new JWT().verify(ctx.token)
            if (info === "failed") {
                return false
            }

            let decoded:any = new JWT().decode(ctx.token)
            let user_id = decoded.user

            try {
                const addresses = await ctx.prisma.address.findMany({
                    where: {
                        id_user: user_id
                    }
                })
                return addresses;
            } catch (error) {
                console.log(error)
                return []
            }
        },

        async report(_:void, __:void, ctx) {
            /* let info:any = new JWT().verify(ctx.token)
            if (info === "failed") {
                return false
            } 

            let decoded:any = new JWT().decode(ctx.token)
            let user_id = decoded.user */


            try {
                const orders = await ctx.prisma.order.findMany({
                    where: {
                        status: false
                    }
                })
                return orders;
            } catch (error) {
                console.log(error)
                return []
            }
        }
    }
}

export default query;
