const Category = require("../../models/category.model")
const AccountAdmin = require("../../models/account-admin.model")
const categoryHelper = require("../../helpers/category.helper")
const moment = require("moment");
const slugify = require("slugify")
module.exports.create = async (req,res) =>{
    const categoryList = await Category.find({
        deleted:false
    })
    const categoryTree = categoryHelper.categoryTree(categoryList)
    res.render("admin/pages/category-create",{
        pageTitle:"Tạo danh mục",
        categoryList: categoryTree
    })
}
module.exports.createPost = async (req,res) =>{
    if(req.body.position){
        req.body.position = parseInt(req.body.position)
    }
    else{
        const totalPosition = await Category.countDocuments({})
        req.body.position = totalPosition + 1
    }

    req.body.createdBy = req.account.id
    req.body.updatedBy = req.account.id
    req.body.avatar = req.file? req.file.path : " "
    const dataFinal = new Category(req.body)
    await dataFinal.save()
    req.flash("success", "Tạo danh mục thành công!");
    res.json({
        code:"success",
    })
}

module.exports.list = async (req,res) =>{
    const status = req.query.status
    const id = req.query.id
    const startDate = req.query.startdate
    const endDate = req.query.enddate
    const dateFilter = {}
    const keyword = req.query.keyword
    const find = {
        deleted:false
    }
    if(status){
        find.status = status
    }
    if(id){
        find.createdBy = id
    }
    if(startDate){
        dateFilter.$gte = moment(startDate).startOf("date").toDate()
    }
    if(endDate){
        dateFilter.$lte = moment(endDate).endOf("date").toDate()
    }
    if(Object.keys(dateFilter).length>0){
        find.createdAt = dateFilter
    }
    if(keyword){
        const slug= slugify(keyword, {
            lower:true
        })
        console.log(slug)
        const keywordRegex =  new RegExp(slug,"i")
        find.slug = keywordRegex 
    }

    const totalCategory = await Category.countDocuments(find)
    const limit = 4
    const totalPage = Math.ceil(totalCategory/limit)
    let page =1
    if(req.query.page>0){
        page = parseInt(req.query.page)
    }
    if(req.query.page>totalPage&&totalPage>0){
        page = parseInt(totalPage)
    }
    const skip = (page - 1)*limit
    console.log(page,limit)

    const pagination ={
        totalPage:totalPage,
        totalCategory:totalCategory,
        skip:skip
    }

    const categoryList = await Category
    .find(find)
    .sort({
        position:"desc"
    })
    .limit(limit)
    .skip(skip)


    for (const item of categoryList) {
        if(item.createdBy){
            const createdByName = await AccountAdmin.findOne({
                _id: item.createdBy
            })
            item.createdBy = createdByName.fullName
        }
        if(item.updatedBy){
            const updatedByName = await AccountAdmin.findOne({
                _id: item.updatedBy
            })
            item.updatedBy = updatedByName.fullName
        }
        item.createdAtFormat = moment(item.createdAt).format("HH:mm - DD/MM/YYYY")
        item.updatedAtFormat = moment(item.updatedAt).format("HH:mm - DD/MM/YYYY")
    };

    const accountList = await AccountAdmin.find({
        status:"active"
    })

    res.render("admin/pages/category-list",{
        pageTitle:"Quản lý danh mục",
        categoryList: categoryList,
        accountList: accountList,
        pagination:pagination
    })
}

module.exports.edit = async (req,res) =>{
    try{
    const categoryList = await Category.find({
        deleted:false
    })
    const categoryTree = categoryHelper.categoryTree(categoryList)
    const categoryCurrent = await Category.findOne({
        _id:req.params.id,
        deleted:false
    })
    res.render("admin/pages/category-edit",{
        pageTitle:"Tạo danh mục",
        categoryList: categoryTree,
        categoryCurrent:categoryCurrent
    })
    } catch (error) {
        res.redirect(`/${pathAdmin}/category/list`)
    }
}

module.exports.editPatch = async (req,res) =>{
   try{
    console.log(req.body)
    const id = req.params.id
    if(req.body.position){
        req.body.position = parseInt(req.body.position)
    }
    else{
        const totalPosition = await Category.countDocuments({})
        req.body.position = totalPosition + 1
    }
    req.body.updatedBy = req.account.id
    if(req.file){
        req.body.avatar = req.file.path
    } else{
        delete req.body.avatar
    }
    await Category.updateOne({
        _id:id,
        deleted:false
    }, req.body)
    req.flash("success", "Chỉnh sửa danh mục thành công!");
    res.json({
        code:"success",
    })
   }catch(error){
    res.json({
        code:"error",
        message:"Id không hợp lệ"
    })
   }
}

module.exports.deletePatch = async (req,res) =>{
    try{
        const id = req.params.id
        await Category.updateOne({
            _id:id
        },{
            deleted:true,
            deletedBy: req.account.id,
            deletedAt: Date.now()
        })
        res.json({
            code:"success"
        })
        req.flash("success","Xóa danh mục thành công!")
    }catch(error){
        res.json({
            code:"error",
            message:"Xóa danh mục thất bại!"
        })
    }
}

module.exports.changePatch = async (req,res) =>{
    try{
        const {status,ids} = req.body
        console.log(req.body)
        console.log(ids)
        switch(status){
            case "active": case "inactive":
                await Category.updateMany({
                    _id : {$in:ids}
                },{status:status})
                req.flash("success","Đổi trạng thái thành công!")
                break
            case "delete":
                await Category.updateMany({
                    _id : {$in : ids}
                },{
                    deleted:true,
                    deletedBy:req.account.id,
                    deletedAt:Date.now()
                })
                req.flash("success","Xóa danh mục thành công!")
                break    
        }
        res.json({
            code:"success"
        })
    }catch(error){
        res.json({
            code:"error",
            message:"Cập nhật trạng thái danh mục thất bại!"
        })
    }
}

