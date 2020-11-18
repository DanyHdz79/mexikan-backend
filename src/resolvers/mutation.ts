import { IResolvers } from "graphql-tools";
import bcryptjs from 'bcryptjs';
import JWT from "../lib/JWT";
import nmail from "../lib/nmail";

// Regex expressions for password validation
const hasNumber = /\d/;
const hasLetter = /[a-zA-Z]/g;
const specialChar = /[`!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/;

const mutation : IResolvers = {
    Mutation: {
        
        async register(_:void, { user }, ctx) {
            // Mutation for the registration of new users
            // As a parameter, it accepts an object with the user's email, name and password.

            const checkUser = await ctx.prisma.user.findMany({
                where: {
                    email: user.email
                }
            });
        
            if (checkUser.length != 0) {
                return { status: false, message: "The user already exists." }
            }

            // Password must meet the following criteria
            if(user.password.length < 10 || user.password.length > 15) {
                return { status: false, message: "Password should be between 10 and 15 characters." }
            }

            if(!hasNumber.test(user.password) || !hasLetter.test(user.password) || !specialChar.test(user.password)) {
                return { status: false, message: "Password should contain numbers, letters and special characters." }
            }
            
            user.password = bcryptjs.hashSync(user.password,10);


            try {
                const newUser = await ctx.prisma.user.create({
                    data: {
                        email: user.email,
                        name: user.name,
                        password: user.password,
                        role: "user" // each user can be a 'seller' or just normal 'user', by default is the later.
                    }
                })
                return { status:true, message: `The user ${user.name} is successfully added.` }
            } catch (error) {
                console.log(error);
                return { status: false, message: "User registration failed." }
            }
        },

        async addAddress(_:void, { address }, ctx) {
            // Mutation that allows a user to add an addresses to their account
            // As a parameter, it receives an object with all the address' attributes
            // By default, the first address added for each user is marked as principal
            
            let info:any = new JWT().verify(ctx.token)
            if (info === "failed") {
                return false
            }

            let decoded:any = new JWT().decode(ctx.token)
            let user_id = decoded.user

            try {
                const princ = await ctx.prisma.address.findMany({
                    where: {
                        id_user: user_id,
                        principal: true
                    }
                });

                if(princ && princ.length) {
                    const newAddress = await ctx.prisma.address.create({
                        data: {
                            street: address.street,
                            city: address.city,
                            state: address.state,
                            zip_code: address.zip_code,
                            country: address.country,
                            phone_number: address.phone_number,
                            instructions: address.instructions,
                            user: {
                                connect: {
                                    id: user_id
                                },
                            },
                            principal: false
                        }
                    })
                } else {
                    const newAddress = await ctx.prisma.address.create({
                        data: {
                            street: address.street,
                            city: address.city,
                            state: address.state,
                            zip_code: address.zip_code,
                            country: address.country,
                            phone_number: address.phone_number,
                            instructions: address.instructions,
                            user: {
                                connect: {
                                    id: user_id
                                },
                            },
                            principal: true
                        }
                    })
                }
                return true
            } catch (error) {
                console.log(error);
                return false
            }
        },

        async deleteAddress(_:void, { id_address }, ctx) {
            // Mutation that allows a user to delete an addresses they have previously registered

            let info:any = new JWT().verify(ctx.token)
            if (info === "failed") {
                return false
            }

            try {
                const newAddress = await ctx.prisma.address.delete({
                    where: {
                        id: id_address
                    }
                })
                return true
            } catch (error) {
                console.log(error);
                return false
            }
        },

        async email(_:void, { contact }, __:void) {
            // Mutation for sending an email to support through the Contact Us form
            // two supponrting email addresses are being used: one for sending the message
            // with the user's info, and one for reiceiving that message.

            let mail:any = new nmail()
            var mailOptions = {
                from: 'Remitente',
                to: 'mexikan.contacto1@gmail.com',
                subject: 'Contacto',
                text: 'Name: ' + contact.name + '\n' + 'Email: ' + contact.email + '\n' + 'Mensaje: ' + contact.message
            };
            let transport = await mail.createTrans();
            transport.sendMail(mailOptions);
            return true
        },

        async addProductToCart(_:void, { product }, ctx) {
            // Mutation that allows a user to add a product to their cart
            // The user must be logged and verified.

            let today = new Date();

            let info: any = new JWT().verify(ctx.token)
            if (info === "failed") {
                return false
            }

            let decoded:any = new JWT().decode(ctx.token)
            let user_id = decoded.user

            try {
                // First, we check if there's already an 'opened' order
                const checkOrder = await ctx.prisma.order.findMany({
                    where: {
                        id_user: user_id,
                        status: true
                    }
                });

                const productInfo = await ctx.prisma.product.findOne({
                    where: {
                        sku: product.id_product,
                    }
                });
    
                //if an 'opened' order exists...
                if(checkOrder && checkOrder.length) {
                    //if a product that has been previously added is added again, just increase queantity
                    const repeatedProduct = await ctx.prisma.order_detail.findMany({
                        where: {
                            id_product: product.id_product,
                            id_order: checkOrder[0].id,
                            design: product.design,
                            size: product.size
                        }
                    });
                    
                    if(repeatedProduct && repeatedProduct.length) {
                        const upQuantity = await ctx.prisma.order_detail.update({
                            where: {
                                id: repeatedProduct[0].id
                            },
                            data: {
                                quantity: {
                                    increment: 1
                                }
                            }
                        })

                    } else {
                        //otherwise just generate a new order detail for the product being added
                        const orderD = await ctx.prisma.order_detail.create({
                            data: {
                                quantity: product.quantity,
                                product: {
                                    connect: {
                                        sku: product.id_product
                                    }
                                },
                                order: {
                                    connect: {
                                        id: checkOrder[0].id
                                    }
                                },
                                design: product.design,
                                size: product.size, 
                                img_custom: product.image
                            }
                        })
                    }
                    
                    //and update the main order
                    const updateOrder = await ctx.prisma.order.update({
                        where: {
                            id: checkOrder[0].id
                        },
                        data: {
                            subtotal: {
                                increment: productInfo.price
                            }
                        }
                    })

                    const updateOrder2 = await ctx.prisma.order.update({
                        where: {
                            id: checkOrder[0].id
                        },
                        data: {
                            total: {
                                increment: productInfo.price
                            }
                        }
                    })

                } else {
                    // If this is the first item being added to the cart
                    // we create an order and an order detail for the product

                    const default_address = await ctx.prisma.address.findMany({
                        where: {
                            id_user: user_id,
                            principal: true
                        }
                    })

                    let newOrder

                    // The order is created using the user's principal address
                    if(default_address && default_address.length) {
                        newOrder = await ctx.prisma.order.create({
                            data: {
                                date: today,
                                subtotal: productInfo.price,
                                total: productInfo.price * 1.16 + 10,
                                user: {
                                    connect: {
                                        id: user_id
                                    }
                                },
                                address: {
                                    connect: {
                                        id: default_address[0].id
                                    }
                                },
                                status: true
                            }
                        })
                    } else {
                        newOrder = await ctx.prisma.order.create({
                            data: {
                                date: today,
                                subtotal: productInfo.price,
                                total: productInfo.price * 1.16 + 10,
                                user: {
                                    connect: {
                                        id: user_id
                                    }
                                },
                                address: {
                                    connect: {
                                        id: default_address[0].id
                                    }
                                },
                                status: true
                            }
                        })
                    }


                    const orderD = await ctx.prisma.order_detail.create({
                        data: {
                            quantity: product.quantity,
                            product: {
                                connect: {
                                    sku: product.id_product
                                }
                            },
                            order: {
                                connect: {
                                    id: newOrder.id
                                }
                            },
                            design: product.design,
                            size: product.size, 
                            img_custom: product.image
                        }
                    })
                }
                return true
            } catch (error) {
                console.log(error);
                return false
            }
        },

        async deleteItem(_:void, { id_item }, ctx) {
            // Mutation that allows a user to delete a product from their cart
            // it accepst the product's sku as parameter

            let info:any = new JWT().verify(ctx.token)
            if (info === "failed") {
                return false
            }

            try {
                const deleteItem = await ctx.prisma.order_detail.delete({
                    where: {
                        id: id_item,
                    }
                });
                return true
            } catch (error) {
                console.log(error);
                return false
            }
        },

        async addQuantity(_:void, { id_item }, ctx) {
            // Mutation that checks if the user's shopping cart already has the product
            // they have chosen to add, and if so, increases the quantity of it by 1

            let info:any = new JWT().verify(ctx.token)
            if (info === "failed") {
                return false
            }

            try {
                const increment = await ctx.prisma.order_detail.update({
                    where: {
                        id: id_item,
                    },
                    data: {
                        quantity: {
                            increment: 1
                        }
                    }
                });
                return true
            } catch (error) {
                console.log(error);
                return false
            }
        },

        async subtQuantity(_:void, { id_item }, ctx) {
            // Mutation that checks if the user's shopping cart already has the product
            // they have chosen to add, and if so, decreases the quantity of it by 1

            let info:any = new JWT().verify(ctx.token)
            if (info === "failed") {
                return false
            }

            try {
                const decrement = await ctx.prisma.order_detail.update({
                    where: {
                        id: id_item,
                    },
                    data: {
                        quantity: {
                            decrement: 1
                        }
                    }
                });
                return true
            } catch (error) {
                console.log(error);
                return false
            }
        },

        async convertToOrder(_:void, { id_address }, ctx) {
            // Mutation that turns the shopping cart to a complete order after
            // the user goes through with their purchase
            // the user's id address must be passed to complete the order
            // naturally, the user must be logged and verified.

            let info:any = new JWT().verify(ctx.token)
            if (info === "failed") {
                return false
            }

            let decoded:any = new JWT().decode(ctx.token)
            let user_id = decoded.user

            try {
                const findCarrito = await ctx.prisma.order.findMany({
                    where: {
                        id_user: user_id,
                        status: true
                    }
                });

                const order = await ctx.prisma.order.update({
                  where: {
                        id: findCarrito[0].id
                    },
                    data: {
                        status: false,
                        address: {
                            connect: {
                                id: id_address
                            }
                        }
                    }
                });
                return true
            } catch (error) {
                console.log(error);
                return false
            }
        },

        async updateUserName(_:void, { new_name }, ctx) {
            // Mutation that allows a user to modify their name in their account's details
            let info:any = new JWT().verify(ctx.token)
            if (info === "failed") {
                return false
            }

            let decoded:any = new JWT().decode(ctx.token)
            let user_id = decoded.user

            try {
                const newName = await ctx.prisma.user.update ({
                    where: {
                        id: user_id
                    },
                    data: {
                        name: new_name
                    }
                })
                return true
            } catch (error) {
                console.log(error);
                return false
            }
        },

        async updateUserPassword(_:void, { password }, ctx) {
            // Mutation that allows a user to modify their password
            // As a parameter, the pair of passwords must be passed (current and new)
            // this pair will be user to verify if the current password matchesand allow the update

            let verification = false

            let info:any = new JWT().verify(ctx.token)
            if (info === "failed") {
                return false
            }

            let decoded:any = new JWT().decode(ctx.token)
            let user_id = decoded.user

            const thisUser = await ctx.prisma.user.findOne({
                where: {
                    id: user_id
                }
            })

            if (bcryptjs.compareSync(password.old_password, thisUser.password)) {
                verification = true
            } 

            try {
                if(verification) {
                    const newPassword = await ctx.prisma.user.update ({
                        where: {
                            id: user_id
                        },
                        data: {
                            password: bcryptjs.hashSync(password.new_password,10)
                        }
                    })
                    return true
                }
                return false
            } catch (error) {
                console.log(error);
                return false
            }
        },

        async princAddress(_:void, { id_address }, ctx) {
            // Mutation that allows a user to set their default or principal address

            let info:any = new JWT().verify(ctx.token)
            if (info === "failed") {
                return false
            }

            let decoded:any = new JWT().decode(ctx.token)
            let user_id = decoded.user

            try {
                //if some other address was already marked as principal, 
                //we look for it and the 'unmark' it

                const princ = await ctx.prisma.address.findMany({
                    where: {
                        id_user: user_id,
                        principal: true
                    }
                });

                if(princ && princ.length) {
                    for(let i = 0; i < princ.length; i++) {
                        if(princ[i].principal == true) {
                            const def = await ctx.prisma.address.update({
                                where: {
                                        id: princ[i].id
                                    },
                                data: {
                                    principal: false,
                                }
                            })
                        }
                    }
                }

                const def = await ctx.prisma.address.update({
                    where: {
                            id: id_address
                        },
                    data: {
                        principal: true,
                    }
                })
                
               return true
            } catch (error) {
                console.log(error);
                return false
            }
        },

        async addToWishList(_:void, { product }, ctx) {
            // Mutation that allows a user to add a product to their wish list
            let info: any = new JWT().verify(ctx.token)
            if (info === "failed") {
                return false
            }

            let decoded:any = new JWT().decode(ctx.token)
            let user_id = decoded.user

            try {
                const checkWishList = await ctx.prisma.wishlist.findMany({
                    where: {
                        id_user: user_id,
                    }
                });

                const productInfo = await ctx.prisma.product.findOne({
                    where: {
                        sku: product.id_product,
                    }
                });

                const repeatedProductInWishList = await ctx.prisma.wishlist.findMany({
                    where: {
                        id_product: product.id_product,
                    }
                });

                if(repeatedProductInWishList) {
                    const wishL = await ctx.prisma.wishlist.create({
                        data: {
                            product: {
                                connect: {
                                    sku: product.id_product
                                }
                            },
                            id_user: user_id
                        }
                    })
                    return true
                } else {
                    return false
                }
            } catch (error) {
                console.log(error);
                return false
            }
        },
    }
}

export default mutation;
