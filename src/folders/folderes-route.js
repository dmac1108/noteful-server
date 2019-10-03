const path = require('path')
const express = require('express')
const xss = require('xss')
const FoldersService = require('./folders-service')

const foldersRouter = express.Router()
const jsonParser = express.json()

const serializeFolder = folder => ({
    id: folder.id,
    name: xss(folder.name),
})

foldersRouter
.route('/')
.get((req,res,next) =>{
    FoldersService.getAllFolders(req.app.get('db'))
    .then(folders =>{
        res.json(folders.map(serializeFolder))
    })
    .catch(next)
})
.post(jsonParser, (req,res,next) => {
    const {name } = req.body
    const newFolder = {name}

        if(name == null) {
            return res.status(400).json({
                error: {
                    message: `Missing name in request body`
                }
            }) 
        }
    
    FoldersService.insertFolder(req.app.get('db'),newFolder)
    .then(folder => {
        res
        .status(201)
        .location(path.posix.join(req.originalUrl, `/${folder.id}`))
        .json(serializeFolder(folder))
    })
    .catch(next)
})

foldersRouter
.route('/:id')
.all((req,res,next) => {
    const folderId = req.params.id;
    FoldersService.getById(req.app.get('db'), folderId)
    .then(folder =>{
        if(!folder){
            return res.status(404).json({
              error: {message: `Folder doesn't exist`}
            })
          }
        res.folder = folder
        next()  
    })
})
.get((req, res, next) =>{
    res.json(serializeFolder(res.folder))
})
.delete((req, res, next) => {
    FoldersService.deleteFolder(req.app.get('db'), req.params.id)
    .then(() =>{
        res.status(204).end()
    })
    .catch(next)
})
.patch(jsonParser, (req, res, next) =>{
    
    const {name} = req.body
    const fieldsToUpdate = {name}

    const numberOfValues = Object.values(fieldsToUpdate).filter(Boolean).length

    if(!name){
        return res.status(400).json({
            error: {message: `Request body must contain a 'name'`}
        })
    }
    
    FoldersService.updateFolder(req.app.get('db'), fieldsToUpdate, req.params.id)
    .then(numRowsAffected =>{
        res.status(204).end()
    })
    

})

module.exports = foldersRouter