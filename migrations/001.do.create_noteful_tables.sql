create table folders (
    id integer primary key generated by default as identity,
    name text not null
);

create table notes (
    id integer primary key generated by default as identity,
    name text not null,
    modified timestamp default now() not null,
    folderId integer 
    references folders(id) ON DELETE CASCADE NOT NULL,
    content text
);

