# XML-To-Relational Mapping: Specification & Concrete Examples

This document illustrates how the XML Schema (`.xsd`) and XML data ingestion engine in `crawler_common.xmlschema` automatically derives a PostgreSQL relational schema and populates it from incoming XML documents.

---

## 1. Core Mapping Rules Summary

The schema planner inspects XSD declarations and decides between creating a **Column in the parent table** or a **Separate Relational Table**:

| XSD / XML Construct | Decision | Relational Artifact |
| :--- | :--- | :--- |
| **Root Element** | Always Table | Top-level table with surrogate PK `id` |
| **Simple Leaf Element** (`maxOccurs="1"`, no attributes) | Inlined Column | Column in parent table (name = element name) |
| **Repeatable Element** (`maxOccurs > 1` or `unbounded`) | Separate Table | Child table with PK `id` and FK `<parent>_id` |
| **Element with Child Elements** (complexType) | Separate Table | Child table with PK `id` and FK `<parent>_id` |
| **Leaf Element with Attributes** (e.g. `<title lang="en">`) | Separate Table | Child table with attribute columns + text `value` column |
| **Attribute named `id`** (e.g. `<item id="42">`) | Renamed Column | Stored as `id_value` to prevent PK collision |
| **Hierarchical Table Naming** | Path Concatenation | `parent_child_grandchild` |
| **Identifier Length $> 63$ chars** | Truncation + Hash | Truncated to 54 chars + `_<sha1[:8]>` |
| **Custom Appinfo Alias** | Explicit Override | `<xs:appinfo><table name="alias"/></xs:appinfo>` |

---

## 2. Example 1: Baseline Library (Attributes, Columns & 1:N Collections)

This example illustrates:
1. Root table creation.
2. Inlining non-repeatable simple leaf elements (`title`, `year`).
3. Repeating elements mapped to child tables (`author`).
4. XML attributes mapped to columns (`isbn`).

### Input XSD Schema (`schema.xsd`)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" elementFormDefault="qualified">
  <xs:element name="library">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="book" maxOccurs="unbounded">
          <xs:complexType>
            <xs:sequence>
              <xs:element name="title" type="xs:string"/>
              <xs:element name="year" type="xs:int"/>
              <xs:element name="author" type="xs:string" maxOccurs="unbounded"/>
            </xs:sequence>
            <xs:attribute name="isbn" type="xs:string" use="required"/>
          </xs:complexType>
        </xs:element>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>
```

### Input XML Document (`data.xml`)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<library>
  <book isbn="978-0132350884">
    <title>Clean Code</title>
    <year>2008</year>
    <author>Robert C. Martin</author>
  </book>
  <book isbn="978-0201616224">
    <title>The Pragmatic Programmer</title>
    <year>1999</year>
    <author>Andrew Hunt</author>
    <author>David Thomas</author>
  </book>
</library>
```

### Generated PostgreSQL DDL

```sql
-- 1. Root Table
CREATE TABLE library (
    id SERIAL PRIMARY KEY
);

-- 2. Book Table (repeating child of library, with attributes & inlined scalar children)
CREATE TABLE library_book (
    id SERIAL PRIMARY KEY,
    library_id INTEGER NOT NULL REFERENCES library(id),
    isbn TEXT NOT NULL,
    title TEXT,
    year INTEGER
);
CREATE INDEX ix_library_book_library_id ON library_book (library_id);

-- 3. Author Table (repeating leaf child of book -> text column 'value')
CREATE TABLE library_book_author (
    id SERIAL PRIMARY KEY,
    library_book_id INTEGER NOT NULL REFERENCES library_book(id),
    value TEXT
);
CREATE INDEX ix_library_book_author_library_book_id ON library_book_author (library_book_id);
```

### Populated Database Rows

#### Table: `library`
| id |
| :--- |
| `1` |

#### Table: `library_book`
| id | library_id | isbn | title | year |
| :--- | :--- | :--- | :--- | :--- |
| `1` | `1` | `978-0132350884` | `Clean Code` | `2008` |
| `2` | `1` | `978-0201616224` | `The Pragmatic Programmer` | `1999` |

#### Table: `library_book_author`
| id | library_book_id | value |
| :--- | :--- | :--- |
| `1` | `1` | `Robert C. Martin` |
| `2` | `2` | `Andrew Hunt` |
| `3` | `2` | `David Thomas` |

---

## 3. Example 2: Biomedical Dataset (1:1 Wrappers, Attributed Scalars & `id` Collisions)

Biomedical schemas (e.g. NCBI Assembly or BioProject) frequently use wrapper tags and attributes on scalar nodes. This example demonstrates:
1. **XML `id` collision handling**: An XML attribute named `id` is translated to column `id_value` so it does not collide with the primary key.
2. **1:1 Complex Subtrees**: A non-repeating complex tag (`<descriptor>`) generates a 1:1 table linked to the parent.
3. **Attributed Scalar Elements**: `<organism taxid="9606">` has an attribute, so it becomes its own table with a `value` column.

### Input XSD Schema (`biomed.xsd`)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="ProjectSet">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="Project" maxOccurs="unbounded">
          <xs:complexType>
            <xs:sequence>
              <xs:element name="descriptor">
                <xs:complexType>
                  <xs:sequence>
                    <xs:element name="title" type="xs:string"/>
                    <xs:element name="organism">
                      <xs:complexType>
                        <xs:simpleContent>
                          <xs:extension base="xs:string">
                            <xs:attribute name="taxid" type="xs:int" use="required"/>
                          </xs:extension>
                        </xs:simpleContent>
                      </xs:complexType>
                    </xs:element>
                  </xs:sequence>
                </xs:complexType>
              </xs:element>
            </xs:sequence>
            <!-- Attribute named 'id' -->
            <xs:attribute name="id" type="xs:int" use="required"/>
            <xs:attribute name="accession" type="xs:string" use="required"/>
          </xs:complexType>
        </xs:element>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>
```

### Input XML Document (`biomed.xml`)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ProjectSet>
  <Project id="129102" accession="PRJNA129102">
    <descriptor>
      <title>Human Microbiome Sequencing</title>
      <organism taxid="9606">Homo sapiens</organism>
    </descriptor>
  </Project>
</ProjectSet>
```

### Generated PostgreSQL DDL

```sql
-- 1. Root Set
CREATE TABLE projectset (
    id SERIAL PRIMARY KEY
);

-- 2. Project table: XML attribute 'id' is renamed to 'id_value'
CREATE TABLE projectset_project (
    id SERIAL PRIMARY KEY,
    projectset_id INTEGER NOT NULL REFERENCES projectset(id),
    id_value INTEGER NOT NULL,
    accession TEXT NOT NULL
);
CREATE INDEX ix_projectset_project_projectset_id ON projectset_project (projectset_id);

-- 3. Descriptor table (1:1 complex child of Project)
CREATE TABLE projectset_project_descriptor (
    id SERIAL PRIMARY KEY,
    projectset_project_id INTEGER NOT NULL REFERENCES projectset_project(id),
    title TEXT
);
CREATE INDEX ix_projectset_project_descriptor_projectset_project_id 
    ON projectset_project_descriptor (projectset_project_id);

-- 4. Organism table (child with attribute 'taxid' and simple text content 'value')
CREATE TABLE projectset_project_descriptor_organism (
    id SERIAL PRIMARY KEY,
    projectset_project_descriptor_id INTEGER NOT NULL REFERENCES projectset_project_descriptor(id),
    taxid INTEGER NOT NULL,
    value TEXT
);
CREATE INDEX ix_projectset_project_descriptor_organism_projectset_project_descriptor_id 
    ON projectset_project_descriptor_organism (projectset_project_descriptor_id);
```

### Populated Database Rows

#### Table: `projectset_project`
| id (PK) | projectset_id (FK) | id_value | accession |
| :--- | :--- | :--- | :--- |
| `1` | `1` | `129102` | `PRJNA129102` |

#### Table: `projectset_project_descriptor`
| id (PK) | projectset_project_id (FK) | title |
| :--- | :--- | :--- |
| `1` | `1` | `Human Microbiome Sequencing` |

#### Table: `projectset_project_descriptor_organism`
| id (PK) | projectset_project_descriptor_id (FK) | taxid | value |
| :--- | :--- | :--- | :--- |
| `1` | `1` | `9606` | `Homo sapiens` |

---

## 4. Example 3: Controlling Table Names with XSD `<xs:annotation>` & `<xs:appinfo>`

By default, the engine generates physical table names by concatenating the ancestral XML path (`parent_child_grandchild`). In deeply nested biomedical schemas, this leads to unwieldy, verbose table names like `project_projectdescr_publication_structuredcitation_authorset_author`.

The engine **already natively supports** clean custom physical table names by placing `<table name="..."/>` (or `<alias>`, `<tableName>`) inside standard W3C XML Schema `<xs:annotation><xs:appinfo>` blocks.

### Input XSD Schema with Annotations (`annotated_schema.xsd`)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:biomed="urn:biomed:xmlschema">
  
  <xs:element name="Project">
    <xs:annotation>
      <xs:appinfo>
        <!-- Custom alias for root table: 'project' instead of 'project' -->
        <table name="project"/>
      </xs:appinfo>
    </xs:annotation>
    <xs:complexType>
      <xs:sequence>
        
        <xs:element name="ProjectDescr">
          <xs:annotation>
            <xs:appinfo>
              <!-- Shorten 'project_descr' -->
              <table name="descr"/>
            </xs:appinfo>
          </xs:annotation>
          <xs:complexType>
            <xs:sequence>
              
              <xs:element name="Publication" maxOccurs="unbounded">
                <xs:annotation>
                  <xs:appinfo>
                    <!-- Shorten to 'pub' -->
                    <table name="pub"/>
                  </xs:appinfo>
                </xs:annotation>
                <xs:complexType>
                  <xs:sequence>
                    <xs:element name="title" type="xs:string"/>
                    <xs:element name="year" type="xs:int"/>
                    
                    <xs:element name="Author" maxOccurs="unbounded">
                      <xs:annotation>
                        <xs:appinfo>
                          <!-- Shorten to 'author' -->
                          <table name="author"/>
                        </xs:appinfo>
                      </xs:annotation>
                      <xs:complexType>
                        <xs:sequence>
                          <xs:element name="first" type="xs:string"/>
                          <xs:element name="last" type="xs:string"/>
                        </xs:sequence>
                      </xs:complexType>
                    </xs:element>
                    
                  </xs:sequence>
                </xs:complexType>
              </xs:element>
              
            </xs:sequence>
          </xs:complexType>
        </xs:element>
        
      </xs:sequence>
      <xs:attribute name="accession" type="xs:string" use="required"/>
    </xs:complexType>
  </xs:element>
</xs:schema>
```

### Input XML Document (`project.xml`)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Project accession="PRJNA1001">
  <ProjectDescr>
    <Publication>
      <title>Structure of the Yeast Ribosome</title>
      <year>2024</year>
      <Author>
        <first>Ada</first>
        <last>Yonath</last>
      </Author>
      <Author>
        <first>Venki</first>
        <last>Ramakrishnan</last>
      </Author>
    </Publication>
  </ProjectDescr>
</Project>
```

### Path-Derived vs. Annotated Table Name Comparison

| XML Element Hierarchy | Default Generated Table Name | With `<xs:appinfo>` Alias |
| :--- | :--- | :--- |
| `<Project>` | `project` | **`project`** |
| `└── <ProjectDescr>` | `project_projectdescr` | **`project_descr`** |
| `    └── <Publication>` | `project_projectdescr_publication` | **`project_descr_pub`** |
| `        └── <Author>` | `project_projectdescr_publication_author` | **`project_descr_pub_author`** |

Notice that child tables retain their logical ancestral chain (`project_descr_pub_author`), but each segment uses the concise alias instead of the full XML tag name.

### Generated PostgreSQL DDL with Aliases

```sql
-- 1. Root Table
CREATE TABLE project (
    id SERIAL PRIMARY KEY,
    accession TEXT NOT NULL
);

-- 2. Project Description (1:1 child table, cleanly named 'project_descr')
CREATE TABLE project_descr (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES project(id)
);
CREATE INDEX ix_project_descr_project_id ON project_descr (project_id);

-- 3. Publication (Child table cleanly named 'project_descr_pub')
CREATE TABLE project_descr_pub (
    id SERIAL PRIMARY KEY,
    project_descr_id INTEGER NOT NULL REFERENCES project_descr(id),
    title TEXT,
    year INTEGER
);
CREATE INDEX ix_project_descr_pub_project_descr_id ON project_descr_pub (project_descr_id);

-- 4. Author (Child table cleanly named 'project_descr_pub_author')
CREATE TABLE project_descr_pub_author (
    id SERIAL PRIMARY KEY,
    project_descr_pub_id INTEGER NOT NULL REFERENCES project_descr_pub(id),
    first TEXT,
    last TEXT
);
CREATE INDEX ix_project_descr_pub_author_project_descr_pub_id 
    ON project_descr_pub_author (project_descr_pub_id);
```

### Populated Database Rows

#### Table: `project`
| id (PK) | accession |
| :--- | :--- |
| `1` | `PRJNA1001` |

#### Table: `project_descr`
| id (PK) | project_id (FK) |
| :--- | :--- |
| `1` | `1` |

#### Table: `project_descr_pub`
| id (PK) | project_descr_id (FK) | title | year |
| :--- | :--- | :--- | :--- |
| `1` | `1` | `Structure of the Yeast Ribosome` | `2024` |

#### Table: `project_descr_pub_author`
| id (PK) | project_descr_pub_id (FK) | first | last |
| :--- | :--- | :--- | :--- |
| `1` | `1` | `Ada` | `Yonath` |
| `2` | `1` | `Venki` | `Ramakrishnan` |

---

### Supported Annotation Syntaxes

In [`_extract_table_alias`](./libs/crawler-common/crawler_common/xmlschema/__init__.py#L237-L261), the parser recognizes any of the following syntaxes within `<xs:annotation><xs:appinfo>`:

1. **Tag `<table name="...">`** *(recommended)*:
   ```xml
   <xs:annotation>
     <xs:appinfo>
       <table name="pub"/>
     </xs:appinfo>
   </xs:annotation>
   ```

2. **Tag `<tableName value="...">` or `<alias name="...">`**:
   ```xml
   <xs:annotation>
     <xs:appinfo>
       <tableName value="pub"/>
     </xs:appinfo>
   </xs:annotation>
   ```

3. **Tag with body text `<table>...</table>`**:
   ```xml
   <xs:annotation>
     <xs:appinfo>
       <table>pub</table>
     </xs:appinfo>
   </xs:annotation>
   ```

4. **Custom XML Namespaces (e.g. `biomed:table`)**:
   Namespaces are automatically stripped, so `<biomed:table name="pub"/>` works identically without special configuration.

5. **Direct text in `<xs:appinfo>`**:
   ```xml
   <xs:annotation>
     <xs:appinfo>pub</xs:appinfo>
   </xs:annotation>
   ```

---

## 5. PostgreSQL Identifier Length Limits & Truncation

When an XML hierarchy is deeply nested and no alias is specified, path concatenation can exceed PostgreSQL's 63-character limit.

To prevent syntax errors, [`_shorten_identifier()`](./libs/crawler-common/crawler_common/xmlschema/__init__.py#L162-L169) automatically truncates any name exceeding 63 characters to 54 characters and appends an 8-character SHA-1 hash:

```
Original path (71 chars):
project_projectdescr_publication_structuredcitation_authorset_author_name

Truncated identifier (63 chars):
project_projectdescr_publication_structuredcitation_aut_e3b0c442
```

This guarantees:
1. **Valid PostgreSQL identifiers** without triggering database errors.
2. **Determinism**: The same XSD path always generates the exact same table and column name.
3. **Collision safety**: Two different elements with similar prefixes will have different SHA-1 hashes.

---

## 6. Summary: XSD Type to PostgreSQL Column Type Mapping

`crawler_common.xmlschema` maps built-in XML Schema Datatypes to SQLAlchemy / PostgreSQL types via `_BUILTIN_TYPE_MAP`:

| XSD Built-in Type | SQLAlchemy Type | PostgreSQL Type | Python Coercion |
| :--- | :--- | :--- | :--- |
| `xs:string`, `xs:token`, `xs:NCName` | `Text()` | `TEXT` | `str(value)` |
| `xs:int`, `xs:short`, `xs:byte` | `Integer()` | `INTEGER` | `int(value)` |
| `xs:long`, `xs:integer`, `xs:positiveInteger` | `BigInteger()` | `BIGINT` | `int(value)` |
| `xs:decimal` | `Numeric()` | `NUMERIC` | `float(value)` |
| `xs:float`, `xs:double` | `Float()` | `DOUBLE PRECISION` | `float(value)` |
| `xs:boolean` | `Boolean()` | `BOOLEAN` | `"true"`, `"1"` $\to$ `True` |
| `xs:date` | `Date()` | `DATE` | `YYYY-MM-DD` |
| `xs:dateTime` | `DateTime(timezone=True)` | `TIMESTAMPTZ` | ISO 8601 parser |
