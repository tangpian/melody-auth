import { Hono } from 'hono'
import {
  routeConfig, typeConfig,
} from 'configs'
import { appHandler } from 'handlers'
import { authMiddleware } from 'middlewares'

const BaseRoute = routeConfig.InternalRoute.ApiApps
const appRoutes = new Hono<typeConfig.Context>()
export default appRoutes

/**
 * @swagger
 * /api/v1/apps:
 *   get:
 *     summary: Get a list of apps
 *     tags: [Apps]
 *     responses:
 *       200:
 *         description: A list of apps
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/App'
 */
appRoutes.get(
  `${BaseRoute}`,
  authMiddleware.s2sReadApp,
  appHandler.getApps,
)

/**
 * @swagger
 * /api/v1/apps/{id}:
 *   get:
 *     summary: Get a single app by ID
 *     tags: [Apps]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *         description: The unique ID of the app
 *     responses:
 *       200:
 *         description: A single app object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppDetail'
 */
appRoutes.get(
  `${BaseRoute}/:id`,
  authMiddleware.s2sReadApp,
  appHandler.getApp,
)

/**
 * @swagger
 * /api/v1/apps:
 *   post:
 *     summary: Create a new app
 *     tags: [Apps]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PostAppReq'
 *     responses:
 *       201:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppDetail'
 */
appRoutes.post(
  `${BaseRoute}`,
  authMiddleware.s2sWriteApp,
  appHandler.postApp,
)

/**
 * @swagger
 * /api/v1/apps/{id}:
 *   put:
 *     summary: Update an existing app by ID
 *     tags: [Apps]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *         description: The unique ID of the app
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PutAppReq'
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppDetail'
 */
appRoutes.put(
  `${BaseRoute}/:id`,
  authMiddleware.s2sWriteApp,
  appHandler.putApp,
)