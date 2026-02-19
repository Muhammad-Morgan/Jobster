const Job = require('../models/Job')
const { StatusCodes } = require('http-status-codes')
const { BadRequestError, NotFoundError } = require('../errors')

const mongoose = require("mongoose");
const moment = require("moment");

const getAllJobs = async (req, res) => {
  // we will keep the userId
  const queryObject = {
    createdBy: req.user.userId
  }

  // let's grap those query params
  const { search, status, jobType, sort } = req.query;

  // now let's apply some filters...
  if (search) {
    queryObject["position"] = {
      $regex: search,
      $options: 'i'
    }
  }
  if (status && status !== 'all') {
    queryObject["status"] = status;
  }
  if (jobType && jobType !== 'all') {
    queryObject["jobType"] = jobType;
  }
  let result = Job.find(queryObject)
  const sortMap = {
    "latest": "-createdAt",
    "oldest": "createdAt",
    "a-z": "position",
    "z-a": "-position"
  }
  if (sort) {
    result = result.sort(sortMap[sort]);
  }
  // pagination
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  result = result.skip(skip).limit(limit);

  // The actual fetching...
  const jobs = await result;

  // total jobs
  const totalJobs = await Job.countDocuments(queryObject);
  // number of pages
  const numOfPages = Math.ceil(totalJobs / limit);

  res.status(StatusCodes.OK).json({ jobs, totalJobs, numOfPages });
}
const getJob = async (req, res) => {
  const {
    user: { userId },
    params: { id: jobId },
  } = req

  const job = await Job.findOne({
    _id: jobId,
    createdBy: userId,
  })
  if (!job) {
    throw new NotFoundError(`No job with id ${jobId}`)
  }
  res.status(StatusCodes.OK).json({ job })
}

const createJob = async (req, res) => {
  req.body.createdBy = req.user.userId
  const job = await Job.create(req.body)
  res.status(StatusCodes.CREATED).json({ job })
}

const updateJob = async (req, res) => {
  const {
    body: { company, position },
    user: { userId },
    params: { id: jobId },
  } = req

  if (company === '' || position === '') {
    throw new BadRequestError('Company or Position fields cannot be empty')
  }
  const job = await Job.findByIdAndUpdate(
    { _id: jobId, createdBy: userId },
    req.body,
    { new: true, runValidators: true }
  )
  if (!job) {
    throw new NotFoundError(`No job with id ${jobId}`)
  }
  res.status(StatusCodes.OK).json({ job })
}

const deleteJob = async (req, res) => {
  const {
    user: { userId },
    params: { id: jobId },
  } = req

  const job = await Job.findByIdAndRemove({
    _id: jobId,
    createdBy: userId,
  })
  if (!job) {
    throw new NotFoundError(`No job with id ${jobId}`)
  }
  res.status(StatusCodes.OK).send()
}

const showStats = async (req, res) => {
  let stats = await Job.aggregate([
    // 1- we wanna get all the jobs createdBy this user
    { $match: { createdBy: mongoose.Types.ObjectId(req.user.userId) } } // for mongoose here we wanna convert userId from string to Mongoose objectId
    ,
    { $group: { _id: '$status', count: { $sum: 1 } } } // 2- we wanna group them based on status
  ])
  // refactor to an object with statuses as keys, and counts as values with reduce

  // for each iteration, will extract the key value - the status - and add to it the value of its value - so the value of count - essentially we are returning an object of 3 properties which are statuses and their values are counts

  stats = stats.reduce((acc, curr) => {
    const { _id: title, count } = curr;
    acc[title] = count;
    return acc;
  }, {})
  console.log(stats);

  res.status(StatusCodes.OK).json({ defaultStats: stats, monthlyApplications: [] })
}

module.exports = {
  createJob,
  deleteJob,
  getAllJobs,
  updateJob,
  getJob,
  showStats
}
