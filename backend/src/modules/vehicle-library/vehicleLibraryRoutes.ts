import { Router } from "express";

import { asyncHandler } from "../../shared/asyncHandler";
import { ok } from "../../shared/response";
import { getRequiredCurrentUser } from "../auth/authMiddleware";
import { vehicleLibraryService } from "./vehicleLibraryService";

const paramValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value ?? "";

export const vehicleLibraryRoutes = Router();

vehicleLibraryRoutes.get(
  "/me",
  asyncHandler(async (req, res) => {
    ok(res, await vehicleLibraryService.getHome(getRequiredCurrentUser(req)));
  }),
);

vehicleLibraryRoutes.post(
  "/libraries",
  asyncHandler(async (req, res) => {
    ok(res, await vehicleLibraryService.createLibrary(getRequiredCurrentUser(req), req.body ?? {}));
  }),
);

vehicleLibraryRoutes.patch(
  "/libraries/:libraryId",
  asyncHandler(async (req, res) => {
    ok(
      res,
      await vehicleLibraryService.updateLibrary(
        getRequiredCurrentUser(req),
        paramValue(req.params.libraryId),
        req.body ?? {},
      ),
    );
  }),
);

vehicleLibraryRoutes.get(
  "/lots",
  asyncHandler(async (req, res) => {
    ok(res, await vehicleLibraryService.listLots(getRequiredCurrentUser(req), req.query));
  }),
);

vehicleLibraryRoutes.post(
  "/lots",
  asyncHandler(async (req, res) => {
    ok(res, await vehicleLibraryService.createLot(getRequiredCurrentUser(req), req.body ?? {}));
  }),
);

vehicleLibraryRoutes.get(
  "/lots/:lotId",
  asyncHandler(async (req, res) => {
    ok(
      res,
      await vehicleLibraryService.getLot(
        getRequiredCurrentUser(req),
        paramValue(req.params.lotId),
        req.query,
      ),
    );
  }),
);

vehicleLibraryRoutes.patch(
  "/lots/:lotId",
  asyncHandler(async (req, res) => {
    ok(
      res,
      await vehicleLibraryService.updateLot(
        getRequiredCurrentUser(req),
        paramValue(req.params.lotId),
        req.body ?? {},
      ),
    );
  }),
);

vehicleLibraryRoutes.delete(
  "/lots/:lotId",
  asyncHandler(async (req, res) => {
    ok(
      res,
      await vehicleLibraryService.deleteLot(
        getRequiredCurrentUser(req),
        paramValue(req.params.lotId),
        req.query,
      ),
    );
  }),
);

vehicleLibraryRoutes.put(
  "/lots/:lotId/materials/:slotCode",
  asyncHandler(async (req, res) => {
    ok(
      res,
      await vehicleLibraryService.putMaterial(
        getRequiredCurrentUser(req),
        "lot",
        paramValue(req.params.lotId),
        paramValue(req.params.slotCode),
        req.body ?? {},
      ),
    );
  }),
);

vehicleLibraryRoutes.delete(
  "/lots/:lotId/materials/:slotCode",
  asyncHandler(async (req, res) => {
    ok(
      res,
      await vehicleLibraryService.deleteMaterial(
        getRequiredCurrentUser(req),
        "lot",
        paramValue(req.params.lotId),
        paramValue(req.params.slotCode),
        req.query,
      ),
    );
  }),
);

vehicleLibraryRoutes.get(
  "/vehicles",
  asyncHandler(async (req, res) => {
    ok(res, await vehicleLibraryService.listVehicles(getRequiredCurrentUser(req), req.query));
  }),
);

vehicleLibraryRoutes.post(
  "/vehicles",
  asyncHandler(async (req, res) => {
    ok(res, await vehicleLibraryService.createVehicle(getRequiredCurrentUser(req), req.body ?? {}));
  }),
);

vehicleLibraryRoutes.get(
  "/vehicles/:vehicleId",
  asyncHandler(async (req, res) => {
    ok(
      res,
      await vehicleLibraryService.getVehicle(
        getRequiredCurrentUser(req),
        paramValue(req.params.vehicleId),
        req.query,
      ),
    );
  }),
);

vehicleLibraryRoutes.patch(
  "/vehicles/:vehicleId",
  asyncHandler(async (req, res) => {
    ok(
      res,
      await vehicleLibraryService.updateVehicle(
        getRequiredCurrentUser(req),
        paramValue(req.params.vehicleId),
        req.body ?? {},
      ),
    );
  }),
);

vehicleLibraryRoutes.delete(
  "/vehicles/:vehicleId",
  asyncHandler(async (req, res) => {
    ok(
      res,
      await vehicleLibraryService.deleteVehicle(
        getRequiredCurrentUser(req),
        paramValue(req.params.vehicleId),
        req.query,
      ),
    );
  }),
);

vehicleLibraryRoutes.put(
  "/vehicles/:vehicleId/materials/:slotCode",
  asyncHandler(async (req, res) => {
    ok(
      res,
      await vehicleLibraryService.putMaterial(
        getRequiredCurrentUser(req),
        "vehicle",
        paramValue(req.params.vehicleId),
        paramValue(req.params.slotCode),
        req.body ?? {},
      ),
    );
  }),
);

vehicleLibraryRoutes.delete(
  "/vehicles/:vehicleId/materials/:slotCode",
  asyncHandler(async (req, res) => {
    ok(
      res,
      await vehicleLibraryService.deleteMaterial(
        getRequiredCurrentUser(req),
        "vehicle",
        paramValue(req.params.vehicleId),
        paramValue(req.params.slotCode),
        req.query,
      ),
    );
  }),
);

vehicleLibraryRoutes.post(
  "/recognition/vin-text",
  asyncHandler(async (req, res) => {
    ok(res, await vehicleLibraryService.recognizeVinText(getRequiredCurrentUser(req), req.body ?? {}));
  }),
);

vehicleLibraryRoutes.post(
  "/recognition/vin-image",
  asyncHandler(async (req, res) => {
    ok(res, await vehicleLibraryService.recognizeVinImage(getRequiredCurrentUser(req), req.body ?? {}));
  }),
);

vehicleLibraryRoutes.get(
  "/recognition-records",
  asyncHandler(async (req, res) => {
    ok(
      res,
      await vehicleLibraryService.listRecognitionRecords(getRequiredCurrentUser(req), req.query),
    );
  }),
);
