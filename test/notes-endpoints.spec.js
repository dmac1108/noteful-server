const {expect} = require('chai');
const knex = require('knex');
const app = require('../src/app')
const {makeNotesArray, makeFoldersArray} = require('./notes.fixtures')
const maliciousNote = require('./notes-malicious-fixtures')

let db

before('make knex instance', ()=> {
    db=knex({
        client: 'pg',
        connection: process.env.TEST_DATABASE_URL,
    })
    app.set('db',db)
})

after('disconnect from db', () => db.destroy())

before('clean the table', () => db.raw('TRUNCATE notes, folders RESTART IDENTITY CASCADE'))

afterEach('cleanup', ()=> db.raw('TRUNCATE table notes, folders RESTART IDENTITY CASCADE'))

describe('GET /api/notes', function(){
    context(`No data in 'notes' table`, ()=>{
        it(`returns an empty array`, ()=>{
            return supertest(app)
            .get('/api/notes')
            .expect(200,[])
        })

    })

    context(`there is data in the 'notes' table`, ()=>{
        const foldersArray = makeFoldersArray()
        const notesArray = makeNotesArray()
        beforeEach(`insert data into the test db`,()=>{
            return db
            .into('folders')
            .insert(foldersArray)
            .then(()=>{
                return db
                .into('notes')
                .insert(notesArray)
            })
            
        })
        it(`responds with 200 and all of the notes`, ()=>{
            return supertest(app)
            .get('/api/notes')
            .expect(200, notesArray)
            
        })

        
        
    })
    
})

describe('GET/:id', function(){
    context(`there is no data in the notes table`, ()=>{
        it(`returns 404 and error message`, ()=>{
            const invalidId = 37891;
            return supertest(app)
            .get(`/api/notes/${invalidId}`)
            .expect(404, {error: {message: `Note doesn't exist`}})
        })
        
    })

    context(`there is data in the 'notes' table`, ()=>{
        const foldersArray = makeFoldersArray()
        const notesArray = makeNotesArray()
        beforeEach(`insert data into the test db`,()=>{
            return db
            .into('folders')
            .insert(foldersArray)
            .then(()=>{
                return db
                .into('notes')
                .insert(notesArray)
            })
            
        })
        
        it('returns the note', ()=>{
            const noteIdToRetrieve = 2;
            const expectedNote = notesArray[noteIdToRetrieve-1];

            return supertest(app)
            .get(`/api/notes/${noteIdToRetrieve}`)
            .expect(200, expectedNote)
                
            })
        })

        context(`Given an XSS attack note`, () => {
            const foldersArray = makeFoldersArray()
    
            beforeEach('insert malicious note', () => {
             return db
                .insert(foldersArray)
                .into('folders')
                .then(()=>{
                    return db
                    .into('notes')
                    .insert([ maliciousNote ])
                })
            })
       
           it('removes XSS attack content', () => {
              return supertest(app)
               .get(`/api/notes/${maliciousNote.id}`)
               .expect(200)
               .expect(res => {
                  expect(res.body.name).to.eql('Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;')
                  expect(res.body.content).to.eql(`Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`)
               })
            })
          })
   
    })



describe('POST/:id', function(){


    const foldersArray = makeFoldersArray()
        
        beforeEach(`insert data into the test db`,()=>{
            return db
            .into('folders')
            .insert(foldersArray)
        })

    it(`creates a new note and returns note`, ()=>{
        this.retries(3)
        const newNote = {
            name: 'New Test Note',
            folderid: 2,
            content: 'This is a test note'
        }
        return supertest(app)
        .post('/api/notes')
        .send(newNote)
        .expect(201)
        .expect(res =>{
            expect(res.body.name).to.eql(newNote.name)
            expect(res.body.folder).to.eql(newNote.folder)
            expect(res.body.content).to.eql(newNote.content)
            expect(res.body).to.have.property('id')
            const expected = new Date().toLocaleString()
            const actual = new Date(res.body.modified).toLocaleString()
            expect(actual).to.eql(expected)
        })
        .then(postRes =>{
            supertest(app)
            .get(`/api/notes/${postRes.body.id}`)
            .expect(postRes.body)
        })

    })
})

describe('DELETE/:id', function(){
    context(`there is no data in the notes table`, ()=>{
        it(`returns 404 and error message`, ()=>{
            const invalidId = 37891;
            return supertest(app)
            .delete(`/api/notes/${invalidId}`)
            .expect(404, {error: {message: `Note doesn't exist`}})
        })
        
    })

    context(`there is data in the 'notes' table`, ()=>{
        const foldersArray = makeFoldersArray()
        const notesArray = makeNotesArray()
        beforeEach(`insert data into the test db`,()=>{
            return db
            .into('folders')
            .insert(foldersArray)
            .then(()=>{
                return db
                .into('notes')
                .insert(notesArray)
            })
            
        })

        
        
        it(`deletes the specified note`, ()=>{
            const noteIdToDelete = 2
            const expectedNotesArray = notesArray.filter(note => note.id != noteIdToDelete)

            return supertest(app)
            .delete(`/api/notes/${noteIdToDelete}`)
            .expect(204)
            .then(()=>{
                return supertest(app)
                .get('/api/notes')
                .expect(expectedNotesArray)
            })
        })
    })
})

describe('PATCH/:id', function(){
    context(`there is no data in the notes table`, ()=>{
        it(`returns 404 and error message`, ()=>{
            const invalidId = 37891;
            return supertest(app)
            .patch(`/api/notes/${invalidId}`)
            .expect(404, {error: {message: `Note doesn't exist`}})
        })
        
    })

    context(`given there are notes in the 'notes' table`, ()=>{
        const foldersArray = makeFoldersArray()
        const notesArray = makeNotesArray()
        beforeEach(`insert data into the test db`,()=>{
            return db
            .into('folders')
            .insert(foldersArray)
            .then(()=>{
                return db
                .into('notes')
                .insert(notesArray)
            })
            
        })

        it(`responds with a 204 and updates the note `, ()=>{
            const noteIdToUpdate = 3
            const fieldsToUpdate = {
                name: 'New Name 1',
                folderid: 2,
                content: 'New content'
            }
            const expectedNote = {
                ...notesArray[noteIdToUpdate-1],
                ...fieldsToUpdate
            }
            return supertest(app)
            .patch(`/api/notes/${noteIdToUpdate}`)
            .send(fieldsToUpdate)
            .expect(204)
            .then(res =>{
                supertest(app)
                .get(`/api/notes/${noteIdToUpdate}`)
                .expect(expectedNote)
            })
        })

        it(`responds with 400 when no required fields are supplied `, ()=>{
            const idToUpdate = 3
            return supertest(app)
            .patch(`/api/notes/${idToUpdate}`)
            .send({irrelevantField: 'foo'})
            .expect(400, {
                error: {message: `Request body must contain either 'name', 'content', or 'folderId'`}
            })
        })

        it(`responds with 204 when updating only a subset of fields`, () => {
            const idToUpdate = 2
            const updateNote = {
              name: 'updated note title',
            }
            const expectedNote = {
              ...notesArray[idToUpdate-1],
              ...updateNote
              
            }
            return supertest(app)
            .patch(`/api/notes/${idToUpdate}`)
            .send({
            ...updateNote,
            fieldToIgnore: 'should not be in GET response'
            })
            .expect(204)
            .then(res =>
              supertest(app)
              .get(`/api/notes/${idToUpdate}`)
              .expect(expectedNote))
      
          })
    })
})