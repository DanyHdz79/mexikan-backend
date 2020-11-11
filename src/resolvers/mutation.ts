import { IResolvers } from "graphql-tools";
import bcryptjs from 'bcryptjs';
import JWT from "../lib/JWT";
import nmail from "../lib/nmail";

const hasNumber = /\d/;
const hasLetter = /[a-zA-Z]/g;
const specialChar = /[`!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/;

const mutation : IResolvers = {
    Mutation: {
        async register(_:void, { user }, ctx) {
            const checkUser = await ctx.prisma.user.findMany({
                where: {
                    email: user.email
                }
            });
        
            if (checkUser.length != 0) {
                return { status: false, message: "The user already exists." }
            }

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
                        role: "user"
                    }
                })
                return { status:true, message: `The user ${user.name} is successfully added.` }
            } catch (error) {
                console.log(error);
                return { status: false, message: "User registration failed." }
            }
        },

        async addAddress(_:void, { address }, ctx) {
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

            let today = new Date();

            let info: any = new JWT().verify(ctx.token)
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

                const productInfo = await ctx.prisma.product.findOne({
                    where: {
                        sku: product.id_product,
                    }
                });
    
                //if existe order con id_user
                if(checkOrder && checkOrder.length) {
                    //crea order_detail y añade a esa order
                    
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
                    
                    //actualizar order
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
                    const default_address = await ctx.prisma.address.findMany({
                        where: {
                            id_user: user_id,
                            principal: true
                        }
                    })

                    //else crea order y añade order_detail
                    let newOrder

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
                            //img_custom: product.image
                        }
                    })
                }
                return true
            } catch (error) {
                console.log(error);
                return false
            }
        },

        async updateUserName(_:void, { new_name }, ctx) {
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

        async convertToOrder(_:void, { id_address }, ctx) {
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

        async deleteItem(_:void, { id_item }, ctx) {
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

        async princAddress(_:void, { id_address }, ctx) {
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
