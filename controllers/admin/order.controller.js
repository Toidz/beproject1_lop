const Order = require("../../models/order.model")
const variable = require("../../config/variable")
const City = require("../../models/city.model")
const moment = require("moment")
module.exports.edit = async (req,res)=>{
    const orderCode = req.params.code
    const orderCurrent = await Order.findOne({
        deleted:false,
        orderCode:orderCode
    })
    orderCurrent.createdAtFormat = moment(orderCurrent.createdAt).format("YYYY-MM-DDTHH:mm")
    for (const item of orderCurrent.cart) {
        item.departureDateFormat = moment(item.departureDate).format("DD/MM/YYYY")
        const locationName = await City.findOne({
            _id:item.location
        })
        item.locationName= locationName
    }
    res.render("admin/pages/order-edit",{
        pageTitle:`Đơn hàng: ${orderCode}`,
        orderCurrent:orderCurrent

    })
}
module.exports.editPatch = async (req,res)=>{
    try {
        const orderCode = req.params.code
        await Order.updateOne({
            orderCode:orderCode
        },req.body)
        req.flash("success","Cập nhật thành công!")
        res.json({
            code:"success"
        })
    } catch (error) {
        res.json({
            code:"error",
            message:"Cập nhật thất bại!"
        })
    }
}
module.exports.list = async (req,res)=>{
    const find = {
        deleted:false
    }
    if(req.query.status){
        find.status = req.query.status
    }
    const filterDate ={}
    if(req.query.startDate){
        filterDate.$gte = moment(req.query.startDate).startOf("date").toDate()
    }
    if(req.query.endDate){
        filterDate.$lte = moment(req.query.endDate).endOf("date").toDate()
    }
    if(Object.keys(filterDate).length>0){
        find.createdAt = filterDate
    }
    if(req.query.method){
        find.method = req.query.method
    }
    if(req.query.statusPay){
        find.payStatus = req.query.statusPay
    }
    if(req.query.keyword){
        const regex = new RegExp(req.query.keyword,"i")
        find.orderCode = regex
    }
     const totalOrder = await Order.countDocuments(find)
    const limit = 4
    const totalPage= Math.ceil(totalOrder/limit)
    let page =1
    if(req.query.page>0){
        page = parseInt(req.query.page)
    }
    if(req.query.page>totalPage&&totalPage>0){
        page = parseInt(totalPage)
    }
    const skip = limit*(page-1)
      console.log(page,limit)
    const pagination ={
        totalPage:totalPage,
        totalOrder:totalOrder,
        skip:skip
    }
    const orderList = await Order
    .find(find)
    .sort({
        createdAt:"desc"
    })
    .limit(limit)
    .skip(skip)
    orderList.forEach(order => {
       order.valueMethod = variable.method.find(item => item.value==order.method)
       order.valueStatusPay = variable.payStatus.find(item => item.value==order.payStatus)
       order.nameMethod=order.valueMethod.lable
       order.nameStatusPay =order.valueStatusPay.lable
       order.time = moment(order.createdAt).format("HH:mm")
       order.day = moment(order.createdAt).format("DD/MM/YYYY")
    });

    res.render("admin/pages/order-list",{
        pageTitle:"Quản lý đơn hàng",
        orderList:orderList,
        pagination:pagination
    })
}
module.exports.deletePatch = async (req,res)=>{
    try {
        console.log(req.params.code)
        const orderCode = req.params.code
        await Order.updateOne({
            orderCode:orderCode
        },{
            deleted:true,
            deletedAt:Date.now(),
            deletedBy: req.account.id,
        })
        req.flash("success","Xóa đơn hàng thành công!")
        res.json({
            code:"success"
        })
    } catch (error) {
        res.json({
            code:"error",
            message:"Xóa đơn hàng thất bại!"
        })
    }
}