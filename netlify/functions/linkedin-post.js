export async function handler(event, context) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
    };
  }

  const { authorization } = event.headers;

  if (!authorization) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "No authorization token" }),
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { content, mediaUrl } = JSON.parse(event.body || "{}");

    if (!content) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Post content is required" }),
      };
    }

    console.log(
      "Creating LinkedIn post with content:",
      content.substring(0, 100) + "..."
    );
    console.log("Media URL:", mediaUrl);

    // First, get the user's profile to get their URN
    const profileResponse = await fetch(
      "https://api.linkedin.com/v2/userinfo",
      {
        headers: {
          Authorization: authorization,
          "LinkedIn-Version": "202312",
        },
      }
    );

    if (!profileResponse.ok) {
      throw new Error(
        `Failed to get user profile: ${profileResponse.statusText}`
      );
    }

    const profileData = await profileResponse.json();
    const userUrn = `urn:li:person:${profileData.sub}`;

    console.log("User URN:", userUrn);

    // Prepare the post data
    const postData = {
      author: userUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: content,
          },
          shareMediaCategory: mediaUrl ? "IMAGE" : "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    // If media is provided, add it to the post
    if (mediaUrl) {
      postData.specificContent["com.linkedin.ugc.ShareContent"].media = [
        {
          status: "READY",
          description: {
            text: "Post media",
          },
          media: mediaUrl,
          title: {
            text: "Post media",
          },
        },
      ];
    }

    console.log("Post data structure:", JSON.stringify(postData, null, 2));

    // Create the post
    const postResponse = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: authorization,
        "LinkedIn-Version": "202312",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postData),
    });

    console.log("LinkedIn API response status:", postResponse.status);
    console.log(
      "LinkedIn API response headers:",
      Object.fromEntries(postResponse.headers.entries())
    );

    const responseData = await postResponse.json();
    console.log("LinkedIn API response data:", responseData);

    if (!postResponse.ok) {
      throw new Error(
        `LinkedIn API error: ${responseData.message || postResponse.statusText}`
      );
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      body: JSON.stringify({
        success: true,
        postId: responseData.id,
        message: "Post created successfully",
      }),
    };
  } catch (error) {
    console.error("Error creating LinkedIn post:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Failed to create LinkedIn post",
        details: error.message,
      }),
    };
  }
}
