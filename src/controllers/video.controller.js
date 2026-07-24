import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        query,
        sortBy = "createdAt",
        sortType = "desc",
        userId,
    } = req.query;

    const filter = {
        isPublished: true,
    };

    if (query) {
        filter.title = {
            $regex: query,
            $options: "i",
        };
    }

    if (userId) {
        filter.owner = userId;
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortType === "asc" ? 1 : -1;

    const videos = await Video.find(filter)
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(Number(limit));

    return res.status(200).json(
        new ApiResponse(
            200,
            videos,
            "Videos fetched successfully"
        )
    );
});


const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body;
    // TODO: get video, upload to cloudinary, create video

    if (!title || !description) {
        throw new ApiError(400, "Title and description are required");
    }
    const videoLocalPath = req.files?.videoFile?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

if (!videoLocalPath) {
    throw new ApiError(400, "Video file is required");
}

if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail is required");
}
const video = await uploadOnCloudinary(videoLocalPath);
const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

if (!video) {
    throw new ApiError(400, "Error while uploading video");
}

if (!thumbnail) {
    throw new ApiError(400, "Error while uploading thumbnail");
}
const videoData = await Video.create({
  videoFile: video.secure_url,
  thumbnail: thumbnail.secure_url,
    title,
    description,
    duration: video.duration,
    owner: req.user?._id
});

if (!videoData) {
    throw new ApiError(500, "Something went wrong while publishing the video");
}

return res.status(201).json(
    new ApiResponse(
        201,
        videoData,
        "Video published successfully"
    )
);
});


const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            video,
            "Video fetched successfully"
        )
    );
});



const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // Update title and description
    if (title) {
        video.title = title;
    }

    if (description) {
        video.description = description;
    }

    // Update thumbnail (optional)
    if (req.file?.path) {
        const thumbnail = await uploadOnCloudinary(req.file.path);

        if (!thumbnail) {
            throw new ApiError(400, "Error while uploading thumbnail");
        }

        video.thumbnail = thumbnail.secure_url;
    }

    await video.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            video,
            "Video updated successfully"
        )
    );
});


const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    await Video.findByIdAndDelete(videoId);

    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Video deleted successfully"
        )
    );
});



const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    video.isPublished = !video.isPublished;

    await video.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponse(
            200,
            video,
            "Video publish status updated successfully"
        )
    );
});


export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}