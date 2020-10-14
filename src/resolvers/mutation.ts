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
                            //img_custom: product.image
                        }
                    })
                    
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
                                increment: productInfo.price + 20
                            }
                        }
                    })

                } else {
                    //else crea order y añade order_detail
                    const newOrder = await ctx.prisma.order.create({
                        data: {
                            date: today,
                            subtotal: productInfo.price,
                            total: productInfo.price * 1.16 + 10,
                            user: {
                                connect: {
                                    id: user_id
                                }
                            },
                            status: true
                        }
                    })

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

            if (!bcryptjs.compareSync(thisUser.password, password.old_password)) {
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
                }

                return true
            } catch (error) {
                console.log(error);
                return false
            }
        },

        async convertToOrder(_:void, { CHOSEN ADDRESS }, ctx) {
            let info:any = new JWT().verify(ctx.token)
            if (info === "failed") {
                return false
            }

            let decoded:any = new JWT().decode(ctx.token)
            let user_id = decoded.user

            try {
                let order = ctx.prisma.order.update({
                    where: {
                        id_user: user_id,
                        status: true
                    },
                    data: {
                        status:false
                    }
                });
                return true
            } catch (error) {
                console.log(error);
                return false
            }
        },

    }
}

export default mutation;
