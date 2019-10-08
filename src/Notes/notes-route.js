const path = require('path')
const express = require('express')
const xss = require('xss')
const NotesService = require('./notes-service')

const notesRouter = express.Router()
const jsonParser = express.json()

const serializeNote = note => ({
    id: note.id,
    name: xss(note.name),
    modified: note.modified,
    folderid: note.folderid,
    content: xss(note.content),
})

notesRouter
.route('/')
.get((req,res,next) =>{
    NotesService.getAllNotes(req.app.get('db'))
    .then(notes =>{
        res.json(notes.map(serializeNote))
    })
    .catch(next)
})
.post(jsonParser, (req,res,next) => {
    const {name, content, folderid} = req.body
    const newNote = {name, content}
    
    for (const [key, value] of Object.entries(newNote))
        if(value == null) {
            return res.status(400).json({
                error: {
                    message: `Missing ${key} in request body`
                }
            }) 
        }
    
    newNote.folderid = folderid
    
    NotesService.insertNote(req.app.get('db'),newNote)
    .then(note => {
        res
        .status(201)
        .location(path.posix.join(req.originalUrl, `/${note.id}`))
        .json(serializeNote(note))
    })
    .catch(next)
})

notesRouter
.route('/:id')
.all((req,res,next) => {
    const noteId = req.params.id;
    NotesService.getById(req.app.get('db'), noteId)
    .then(note =>{
        if(!note){
            return res.status(404).json({
              error: {message: `Note doesn't exist`}
            })
          }
        res.note = note
        next()  
    })
    .catch(next)
})
.get((req, res, next) =>{
    res.json(serializeNote(res.note))
})
.delete((req, res, next) => {
    NotesService.deleteNote(req.app.get('db'), req.params.id)
    .then(() =>{
        res.status(204).end()
    })
    .catch(next)
})
.patch(jsonParser, (req, res, next) =>{
    
    const {name, content, folderId} = req.body
    const noteFieldsToUpdate = {name, content, folderId}

    const numberOfValues = Object.values(noteFieldsToUpdate).filter(Boolean).length

    if(numberOfValues === 0){
        return res.status(400).json({
            error: {message: `Request body must contain either 'name', 'content', or 'folderId'`}
        })
    }
    
    NotesService.updateNote(req.app.get('db'), noteFieldsToUpdate, req.params.id)
    .then(numRowsAffected =>{
        res.status(204).end()
    })
    

})

module.exports = notesRouter