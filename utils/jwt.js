const jwt = require('jsonwebtoken');

module.exports = function(admin){

    return jwt.sign(
        {
            id: admin._id,
            email: admin.email,
            role: admin.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES
        }
    );

};