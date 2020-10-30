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

            let cartArray = [];

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

                    for(let i = 0; i < cartProducts.length; i++) {
                        let cartItem = {
                            sku: cartProducts[i].id_product,
                            name: "",
                            price: 0.0,
                            description: "",
                            quantity: cartProducts[i].quantity,
                            design: cartProducts[i].design,
                            size: 0,
                            image: cartProducts[i].size,
                        };
            
                        cartArray.push(cartItem);
                    }

                    for(let i = 0; i < cartProducts.length; i++) {
                        const productInfo = await ctx.prisma.product.findOne({
                            where: {
                                sku: cartProducts[i].id_product,
                            }
                        })
                        cartArray[i].name = productInfo.name;
                        cartArray[i].description = productInfo.description;
                        cartArray[i].price = productInfo.price;
                        cartArray[i].image = productInfo.img;
                    }

                    return cartArray;
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

        async prevOrders(_:void, __:void, ctx) {
            let info:any = new JWT().verify(ctx.token)
            if (info === "failed") {
                return false
            } 

            let decoded:any = new JWT().decode(ctx.token)
            let user_id = decoded.user

            let cartArray = [];

            try {
                const orders = await ctx.prisma.order.findMany({
                    where: {
                        id_user: user_id,
                        status: false
                    }
                });

                if(orders && orders.length) {
                    const id_cart = orders[0].id
                    const cartProducts = await ctx.prisma.order_detail.findMany({
                        where: {
                            id_order: id_cart,
                        }
                    })

                    for(let i = 0; i < cartProducts.length; i++) {
                        let cartItem = {
                            id_order: id_cart,
                            sku: cartProducts[i].id_product,
                            name: "",
                            price: 0.0,
                            description: "",
                            quantity: cartProducts[i].quantity,
                            design: cartProducts[i].design,
                            size: 0,
                            image: cartProducts[i].size,
                        };
            
                        cartArray.push(cartItem);
                    }

                    for(let i = 0; i < cartProducts.length; i++) {
                        const productInfo = await ctx.prisma.product.findOne({
                            where: {
                                sku: cartProducts[i].id_product,
                            }
                        })
                        cartArray[i].name = productInfo.name;
                        cartArray[i].description = productInfo.description;
                        cartArray[i].price = productInfo.price;
                        cartArray[i].image = productInfo.img;
                    }

                    return cartArray;
                }
                 return [];
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
        },

        async searchBar(_:void, { search }, ctx) {
            try {
                const match = await ctx.prisma.product.findMany({
                    where: {
                        name: {
                            contains: search
                        }
                    }
                })
                return match;
            } catch (error) {
                console.log(error)
                return []
            }
        }
    }
}

export default query;
