import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    // Generate JWT
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "6d" },
    );
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      maxAge: 6 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        email: user.email,
        phone: user.contact,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const logoutUser = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // only secure in production
    sameSite: "strict",
  });

  res.status(200).json({ message: "Logout successful" });
};

// update profile
export const updateProfile = async (req, res) => {
  const userId = req.user.id;
  const { name, phone, password } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Update name and phone
    user.name = name || user.name;
    user.phone = phone || user.phone;

    // If password is provided, check if it's same as old one
    if (password?.trim()) {
      const isSame = await bcrypt.compare(password, user.password);
      if (isSame) {
        return res.status(400).json({
          message: "New password must be different from the old password",
        });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      user.password = hashedPassword;
    }

    await user.save();
    res.status(200).json({ message: "Profile updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
