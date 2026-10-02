const express = require('express');
const multer = require('multer');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.static('public'));
app.use(express.json());

const upload = multer();
const port = 80;

const pool = mysql.createPool({
    host: "student-databases.cvode4s4cwrc.us-west-2.rds.amazonaws.com",
    user: "STEPHANIECONTRER",
    password: "rrMJ9n9QN5GDjR1avWtiatZPDYkaoz8rFE7",
    database: 'STEPHANIECONTRER',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function query(sql, params) {
    const [results,] = await pool.execute(sql, params);
    return results;
}

app.get(
    '/anime/',
    upload.none(),
    async (request, response) => {
        let result = {};
        try {
            let selectSql = `
            SELECT
                a.id,
        a.name,
        a.genre,
        a.has_dub,
        a.has_service_scene,
        d.name_demographic,
        d.target_audience
            FROM anime a
            INNER JOIN demographic d ON a.demographic_id = d.id
        `;
            let whereStatements = [];
            let queryParameters = [];

            if (typeof request.query.name !== 'undefined' && request.query.name.length > 0) {
                whereStatements.push('a.name LIKE ?');
                queryParameters.push("%" + request.query.name + "%");
            }

            if (typeof request.query.genre !== 'undefined' && request.query.genre.length > 0) {
                whereStatements.push('a.genre LIKE ?');
                queryParameters.push("%" + request.query.genre + "%");
            }

            if (request.query.hasDub === 'true') {
                whereStatements.push('a.has_dub = ?');
                queryParameters.push(1);
            }

            if (request.query.excludeService === 'true') {
                whereStatements.push('a.has_service_scene = ?');
                queryParameters.push(0);
            }

            if (whereStatements.length > 0) {
                selectSql = selectSql + ' WHERE ' + whereStatements.join(' AND ');
            }

            selectSql += ' ORDER BY a.name ASC';

            let limitValue = 10;

            if (request.query.limit !== undefined && request.query.limit.trim() !== '') {
                let parsedLimit = parseInt(request.query.limit, 10);

                if (!isNaN(parsedLimit) && parsedLimit > 0) {
                    limitValue = Math.min(parsedLimit, 100);
                }
            }
            selectSql += ` LIMIT ${Number(limitValue)}`;
            result = await query(selectSql, queryParameters);

        } catch (error) {
            console.error(error);
            return response.status(500).json({ message: 'Something went wrong with the server :/' });
        }

        response.json({ 'data': result });
    });

app.post('/anime/', async (request, response) => {
    const { name, genre, has_service_scene, has_dub, demographic_id } = request.body;

    let fieldErrors = {};

    if (!name || typeof name !== 'string' || name.trim() === '') {
        fieldErrors.name = "Name of Anime cannot be empty (•᷄- •᷅ ;) ";
    }
    if (!genre || typeof genre !== 'string' || genre.trim() === '') {
        fieldErrors.genre = "Main Genre cannot be empty (•᷄- •᷅ ;)";
    }
    if (typeof has_service_scene !== 'boolean') {
        fieldErrors.serviceScene = "Service scene must be true or false ( ˶°ㅁ°) !!";
    }
    if (typeof has_dub !== 'boolean') {
        fieldErrors.dub = "Dub must be true or false ( ˶°ㅁ°) !!";
    }
    if (typeof demographic_id !== 'number' || !Number.isInteger(demographic_id) || demographic_id <= 0) {
        fieldErrors.demographic = "Demographic must be a valid positive number (•᷄- •᷅ ;) ";
    }

    if (Object.keys(fieldErrors).length > 0) {
        return response.status(400).json({ errors: fieldErrors });
    }

    try {
        const insertSql = `
            INSERT INTO anime (name, genre, has_service_scene, has_dub, demographic_id)
            VALUES (?, ?, ?, ?, ?)
        `;

        const serviceSceneVal = has_service_scene ? 1 : 0;
        const dubVal = has_dub ? 1 : 0;

        const result = await query(insertSql, [
            name.trim(),
            genre.trim(),
            serviceSceneVal,
            dubVal,
            demographic_id
        ]);

        response.status(201).json({ message: 'Anime successfully added to the database! ＼(＾▽＾)／' });

    } catch (error) {
        console.error("Insert Error:", error);
        response.status(500).json({ message: 'Database error occurred during insert ૮(˶ㅠ︿ㅠ)ა.' });
    }
});

app.put('/anime/:id', async (request, response) => {
    const { name, genre, has_service_scene, has_dub, demographic_id } = request.body;
    const animeId = request.params.id;

    let fieldErrors = {};

    if (!name || typeof name !== 'string' || name.trim() === '') {
        fieldErrors.name = "Name of Anime cannot be empty (•᷄- •᷅ ;) ";
    }
    if (!genre || typeof genre !== 'string' || genre.trim() === '') {
        fieldErrors.genre = "Main Genre cannot be empty (•᷄- •᷅ ;)";
    }
    if (typeof has_service_scene !== 'boolean') {
        fieldErrors.serviceScene = "Service scene must be true or false ( ˶°ㅁ°) !!";
    }
    if (typeof has_dub !== 'boolean') {
        fieldErrors.dub = "Dub must be true or false ( ˶°ㅁ°) !!";
    }
    if (typeof demographic_id !== 'number' || !Number.isInteger(demographic_id) || demographic_id <= 0) {
        fieldErrors.demographic = "Demographic must be a valid positive number (•᷄- •᷅ ;) ";
    }

    if (Object.keys(fieldErrors).length > 0) {
        return response.status(400).json({ errors: fieldErrors });
    }

    try {
        const updateSql = `
            UPDATE anime 
            SET name = ?, genre = ?, has_service_scene = ?, has_dub = ?, demographic_id = ?
            WHERE id = ?
        `;

        const serviceSceneVal = has_service_scene ? 1 : 0;
        const dubVal = has_dub ? 1 : 0;

        const result = await query(updateSql, [
            name.trim(),
            genre.trim(),
            serviceSceneVal,
            dubVal,
            demographic_id,
            animeId
        ]);

        if (result.affectedRows === 0) {
            return response.status(404).json({ message: 'Anime not found to update.' });
        }

        response.status(200).json({ message: 'Anime successfully updated! (＾▽＾)' });

    } catch (error) {
        console.error("Update Error:", error);
        response.status(500).json({ message: 'Database error occurred during update ૮(˶ㅠ︿ㅠ)ა.' });
    }
});

app.get('/anime/:id', async (request, response) => {
    try {
        const selectSql = `
            SELECT id, name, genre, has_dub, has_service_scene, demographic_id 
            FROM anime 
            WHERE id = ?
        `;
        const result = await query(selectSql, [request.params.id]);

        if (result.length === 0) {
            return response.status(404).json({ message: 'Anime not found ૮(˶ㅠ︿ㅠ)ა' });
        }

        response.json({ data: result[0] });
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Server error ૮(˶ㅠ︿ㅠ)ა' });
    }
});

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port} (⌐■ ͜ʖ■) heehe..`);
});