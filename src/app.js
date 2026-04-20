const express = require("express");
const path = require("node:path");
const { get, run, all } = require("./database");
const { calculateRideCost } = require("./pricing");
const {
  validateStartRidePayload,
  validateEndRidePayload,
  parseRideId,
} = require("./validation");

/**
 * app.js file is responsible for 
 * defining routes, 
 * handling HTTP requests and responses,
 * and handling errors.
 */

/**
 * Creates and configures an Express application for the Bike Ride Service API.
 * @param {import('sqlite3').Database} db - Open SQLite connection shared by all routes.
 * @returns {import('express').Express} Fully configured Express app instance.
 */
function createApp(db) {
  const app = express();


  /**
   * is a middleware setup in Express module.
   * Its purpose is to:
   * - Automatically parse JSON data sent in the request body.
   * - Convert that JSON text into a JavaScript object.
   * - Then attach that JSON object to req.body so you can easily use it later in your route handlers.
   */
  app.use(express.json());





  /**
   * is used to serve static files to the browser.
   * it lets the browser directly access HTML, CSS, and JavaScript files.
   */
  app.use(express.static(path.join(__dirname, "..", "public")));





  /**
   * This is a health check endpoint,
   * used to quickly verify whether the server is running properly
   */
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });





  /**
   * API endpoint: GET /ride, retrieves a list of all rides from the server database
   */
  app.get("/ride", async (_req, res, next) => {
    // Calls the helper function all(...) to query multiple records from SQLite.
    try {
      const rides = await all(
        db,
        `SELECT id, start_time, end_time, status
         FROM rides
         ORDER BY id DESC`
      );
      /**
       * Sends back an HTTP 200 (OK) response.
       * The response body is a JSON object containing a rides array.
       * Each ride only includes the fields needed by the frontend:
       * - rideId (renamed from DB field id)
       * - startTime
       * - endTime
       * - status
       */
      res.status(200).json({
        rides: rides.map((ride) => ({
          rideId: ride.id,
          startTime: ride.start_time,
          endTime: ride.end_time,
          status: ride.status,
        })),
      });
    } catch (error) {
      next(error);
    }
  });








  /**
   * Validate input → check for duplicate RideIDs 
   * → insert into the database → return new ride info.
   */
  app.post("/ride/start", async (req, res, next) => {

    /**
     * Checks if the request body is valid.
     * If validation fails → responds with HTTP 400 Bad Request.
     */
    try {
      const validation = validateStartRidePayload(req.body);
      if (!validation.ok) {
        res.status(400).json({ error: validation.error });
        return;
      }

      /**
       * to simulate a ride that started some time ago.
       * , if elapsedMinutes = 15,
       * then startTime = now - 15 minutes.
       */
      const elapsedMinutes = req.body.elapsedMinutes ?? 0;
      const startTime = new Date(Date.now() - elapsedMinutes * 60 * 1000).toISOString();
      const defaultUserId = "TEST-USER";
      const internalBikeId = "SYSTEM-BIKE";
      let result;

      /**
       * If tester provides rideId, insert that ID directly after uniqueness check.
       * Otherwise let generate a unique ID automatically.
       */
      if (req.body.rideId !== undefined) {
        const existingRide = await get(db, "SELECT id FROM rides WHERE id = ?", [req.body.rideId]);
        if (existingRide) {
          res.status(409).json({ error: "Ride ID already exists. Please choose another rideId." });
          return;
        }

        // A rideId is provided, write it into the database
        result = await run(
          db,
          `INSERT INTO rides (id, bike_id, user_id, start_time, status)
           VALUES (?, ?, ?, ?, 'started')`,
          [req.body.rideId, internalBikeId, defaultUserId, startTime]
        );
      } else {
        // No rideId is provided, generate a unique ID by SQLite's AUTOINCREMENT feature.
        result = await run(
          db,
          `INSERT INTO rides (bike_id, user_id, start_time, status)
           VALUES (?, ?, ?, 'started')`,
          [internalBikeId, defaultUserId, startTime]
        );
      }

      // if the operation succeeds, return HTTP 201 Created
      res.status(201).json({
        rideId: req.body.rideId ?? result.lastID,
        startTime,
        elapsedMinutes,
        status: "started",
      });
    } catch (error) {
      next(error);
    }
  });






  /**
   * /ride/end server endpoint 
   * Validate → Check existence → Prevent duplicate end 
   * → Update end_time and status → Return result.
   */
  app.post("/ride/end", async (req, res, next) => {

    /**
     * Ensures the request has a valid rideId.
     * If the input is invalid → respond with HTTP 400 Bad Request.
     */ 
    try {
      const validation = validateEndRidePayload(req.body);
      if (!validation.ok) {
        res.status(400).json({ error: validation.error });
        return;
      }

      /**
       * Checks if the ride exists in the database.
       * If the ride does not exist → respond with HTTP 404 Not Found.
       */
      const ride = await get(db, "SELECT * FROM rides WHERE id = ?", [req.body.rideId]);
      if (!ride) {
        res.status(404).json({ error: "Ride not found." });
        return;
      }

      /**
       * Checks if the ride has already been ended.
       * If the ride has already been ended → respond with HTTP 409 Conflict.
       */
      if (ride.status === "ended") {
        res.status(409).json({ error: "Ride already ended." });
        return;
      }

      //  Generate the end time, Creates a timestamp for when the ride is ended.
      const endTime = new Date().toISOString();
      // Marks the ride as ended and stores the end_time in server database.
      await run(
        db,
        "UPDATE rides SET end_time = ?, status = 'ended' WHERE id = ?",
        [endTime, req.body.rideId]
      );

      // if the operation succeeds, return HTTP 200 OK
      res.status(200).json({
        rideId: ride.id,
        startTime: ride.start_time,
        endTime,
        status: "ended",
      });
    } catch (error) {
      next(error);
    }
  });







  /**
   *  GET /ride/:id server endpoint, which retrieves detailed information for a specific ride,
   *  including its cost status and pricing details 
   */
  app.get("/ride/:id", async (req, res, next) => {
    /**
     * Checks whether the ride ID in the URL is a valid positive integer.
     * If it's invalid → respond with HTTP 400 Bad Request.
     */
    try {
      const parsedId = parseRideId(req.params.id);
      if (!parsedId.ok) {
        res.status(400).json({ error: parsedId.error });
        return;
      }

      /**
       * Checks if the ride exists in the database.
       * If the ride does not exist → respond with HTTP 404 Not Found.
       */
      const ride = await get(db, "SELECT * FROM rides WHERE id = ?", [parsedId.value]);
      if (!ride) {
        res.status(404).json({ error: "Ride not found." });
        return;
      }

      /**
       * Looks up the ride record by its ID.
       * If no record is found → respond with HTTP 404 Ride not found.
       * The system performs the cost calculation using the start and end times.
       * The cost status changes to "ready" because pricing information is now available.
       */
      let pricingBreakdown = null;
      let costStatus = "pending";
      if (ride.end_time) { // If the ride has ended, calculate the cost
        pricingBreakdown = calculateRideCost(new Date(ride.start_time), new Date(ride.end_time));
        costStatus = "ready";
      } // If the ride has not ended, set the cost status to pending

      // if the operation succeeds, return HTTP 200 OK
      res.status(200).json({
        rideId: ride.id,
        startTime: ride.start_time,
        endTime: ride.end_time,
        status: ride.status,
        costStatus,
        pricingBreakdown,
      });
    } catch (error) {
      next(error);
    }
  });




  /**
   * GET /ride/:id/cost server endpoint, 
   * which is dedicated to calculating and returning the cost for a specific ride 
   */
  app.get("/ride/:id/cost", async (req, res, next) => {
    /**
     * Checks whether the ride ID in the URL is a valid positive integer.
     * If it's invalid → respond with HTTP 400 Bad Request.
     */
    try {
      const parsedId = parseRideId(req.params.id);
      if (!parsedId.ok) {
        res.status(400).json({ error: parsedId.error });
        return;
      }

      /**
       * Looks up the ride by its ID.
       * If it doesn't exist → respond with HTTP 404 Ride not found.
       */
      const ride = await get(db, "SELECT * FROM rides WHERE id = ?", [parsedId.value]);
      if (!ride) {
        res.status(404).json({ error: "Ride not found." });
        return;
      }

      /**
       * If the ride hasn’t ended yet → respond with HTTP 409 Conflict.
       * Reason: an unfinished ride doesn’t have a full duration,
       * so it shouldn’t be priced yet.
       */
 
      if (!ride.end_time) {
        res.status(409).json({ error: "Ride must be ended before calculating cost." });
        return;
      }

      // Calculate the cost using the start and end times.
      const breakdown = calculateRideCost(new Date(ride.start_time), new Date(ride.end_time));
      // if the operation succeeds, return HTTP 200 OK
      res.status(200).json({
        rideId: ride.id,
        startTime: ride.start_time,
        endTime: ride.end_time,
        pricingBreakdown: breakdown,
      });
    } catch (error) {
      next(error);
    }
  });






  
  /**
   * Centralized error handler to avoid leaking stack traces to API clients.
   */
  app.use((error, _req, res, _next) => {
    // Log full error in server logs for debugging by maintainers.
    // Return a stable generic message to clients for security and consistency.
    // eslint-disable-next-line no-console
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  });

  return app;
}

module.exports = {
  createApp,
};
