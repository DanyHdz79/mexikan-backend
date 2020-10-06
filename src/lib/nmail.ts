class nmail {
    private nodemailer:any

    constructor() {
        this.nodemailer = require('nodemailer');
    }

    async createTrans() {
        return this.nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: 'mexikan.admon@gmail.com',
                pass: 'M3x1k4n&'
            }
        });
    }
}

export default nmail;