import { IResolvers } from "graphql-tools";
import bcryptjs from 'bcryptjs';
import JWT from "../lib/JWT";
import jwt_decode from 'jwt-decode';


const query : IResolvers = {
    Query: {
        
        async logIn(_:void, { user }, ctx) {
            // Query for the login of users
            // As a parameter, it accepts an object formed by the user's email and password
            // and returns a Json Web Token.

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
            // Query that returns all the products that exist in the system
            // Since the product info is in one table and the image in another,
            // 2 queries are performed and then joined in a single object with all the attributes.

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

        async getProductInfo(_:void, { product_id }, ctx) {
            // Query that shows the information of a given product
            // As a parameter it accepts the product's identifier (sku)
            // and returns all the details of that product.

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

        async showCart(_:void, __:void, ctx) {
            // Query that returns the products that a user has in their shopping cart
            // The user must be logged and verified. 

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
                            id_detail: cartProducts[i].id,
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

        async getUserAddresses(_:void, __:void, ctx) {
            // Query that returns all the non-principal addresses a user has registered

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

        async getPrincUserAddress(_:void, __:void, ctx) {
            // Query that returns the principal address that the user has selected

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
       
        async prevOrders(_:void, __:void, ctx) {
            // Query that shows past completed orders the user has made

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
            // Query that returns the report generated by the purchase of a product
            // Allegedly, only users registered as 'sellers' have access to this

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

        async searchBar(_:void, { search }, ctx) {
            // Query that enables the site's search bar
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

        async getImageColor(_:void, { sku, id_color }, ctx) {
            // Query that returns the product's selected image
            // The stored images for a same product correspond 
            // to each of the colors available for that specific product.
            // For now, we assumed 5 different colors per product.
            
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
