import { IResolvers } from "graphql-tools";
import bcryptjs from 'bcryptjs';
import JWT from "../lib/JWT";
import jwt_decode from 'jwt-decode';


const query : IResolvers = {
    Query: {
        // Query for the login of users
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

        // Query that returns all the products that exist in the system
        async getAllProducts(_:void, __:void, ctx) {
            try {
                const products = await ctx.prisma.product.findMany({})
                let prodArray = []

                for(let i = 0; i < products.length; i++) {
                    const image = await ctx.prisma.image.findMany({
                        where: {
                            id_product: products[i].sku
                        }
                    });
                    let product = {
                        sku: products[i].sku,
                        name: products[i].name,
                        price: products[i].price,
                        description: products[i].description,
                        img: image[0].image
                    }

                    prodArray.push(product)
                }
                return prodArray;
            } catch (error) {
                console.log(error)
                return []
            }
        },

        // Query that shows the information of a given product
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

                const image = await ctx.prisma.image.findMany({
                    where: {
                        id_product: info.sku
                    }
                });

                let product = {
                    sku: info.sku,
                    name: info.name,
                    price: info.price,
                    description: info.description,
                    img: image[0].image
                }

                return product;
            } catch (error) {
                console.log(error)
                return []
            }
        },

        // Query that returns the products that a user has in their shopping cart
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
                        const img = await ctx.prisma.image.findMany({
                            where: {
                                id_product: cartProducts[i].id_product,
                            }
                        })

                        let im = img[cartProducts[i].design].image

                        let cartItem = {
                            sku: cartProducts[i].id_product,
                            name: "",
                            price: 0.0,
                            description: "",
                            quantity: cartProducts[i].quantity,
                            design: cartProducts[i].design,
                            size: cartProducts[i].size,
                            image: im,
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
                    }

                    return cartArray;
                }
                 return [];
            } catch (error) {
                console.log(error)
                return []
            }
        },

        // Query that returns all the address a user has registered
        async getUserAddresses(_:void, __:void, ctx) {
            let info:any = new JWT().verify(ctx.token)
            if (info === "failed") {
                return false
            }

            let decoded:any = new JWT().decode(ctx.token)
            let user_id = decoded.user

            try {
                const addresses = await ctx.prisma.address.findMany({
                    where: {
                        id_user: user_id,
                        principal: false
                    }
                })
                return addresses;
            } catch (error) {
                console.log(error)
                return []
            }
        },

        // Query that returns the main address that the user has selected
        async getPrincUserAddress(_:void, __:void, ctx) {
            let info:any = new JWT().verify(ctx.token)
            if (info === "failed") {
                return false
            }

            let decoded:any = new JWT().decode(ctx.token)
            let user_id = decoded.user

            try {
                const address = await ctx.prisma.address.findMany({
                    where: {
                        id_user: user_id,
                        principal: true
                    }
                })
                return address;
            } catch (error) {
                console.log(error)
                return []
            }
        },
        // Query that shows past orders the user has made
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

        // Query that returns the report generated by the purchase of a product
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

                let reportObjArr = []

                for(let i = 0; i < orders.length; i++) {
                    let order_id = orders[i].id
                    let orderInfo = await ctx.prisma.order_detail.findMany({
                        where: {
                            id_order: order_id
                        }
                    })

                    let orderAddress = await ctx.prisma.address.findOne({
                        where: {
                            id: orders[i].id_address
                        }
                    })

                    let time = orders[i].date.getTime()
                    let date = new Date(time)

                    let reportObj = {
                        id: order_id,
                        user: orders[i].id_user,
                        total: orders[i].total,
                        address: orderAddress,
                        date: date.toString(),
                        productDetails: orderInfo,
                    };
                    
                    reportObjArr.push(reportObj)
                }
                return reportObjArr;
            } catch (error) {
                console.log(error)
                return []
            }
        },

        // Query that enables the site's search bar
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
        },

        // Query that returns the product's selected image
        async getImageColor(_:void, { sku, id_color }, ctx) {
            try {
                const img = await ctx.prisma.image.findMany({
                    where: {
                        id_product: sku
                    }
                })

                if(id_color === 0) return img[0].image;
                else if(id_color === 1) return img[1].image;
                else if(id_color === 2) return img[2].image;
                else if(id_color === 3) return img[3].image;
                else return img[4].image;
            } catch (error) {
                console.log(error)
                return []
            }
        }
    }
}

export default query;
